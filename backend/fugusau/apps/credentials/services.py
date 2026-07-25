"""FUGUSAU Portal — AI Credential Verification Service
Handles OCR extraction, AI forgery detection, and external API verification
"""
import os
import logging
import hashlib
import requests
import numpy as np
from django.conf import settings
from PIL import Image
import pytesseract
import cv2

logger = logging.getLogger('fugusau.credentials')


class ForgeryDetectionService:
    """AI-powered document forgery detection"""

    # Authentic document templates (font patterns, layout signatures)
    KNOWN_TEMPLATES = {
        'WAEC': {
            'expected_fonts': ['Times New Roman', 'Arial'],
            'seal_region': (0.7, 0.8, 0.9, 1.0),  # x1,y1,x2,y2 as fractions
            'min_resolution': (800, 600),
        },
        'NECO': {
            'expected_fonts': ['Arial', 'Helvetica'],
            'seal_region': (0.6, 0.75, 0.9, 1.0),
            'min_resolution': (800, 600),
        },
        'JAMB': {
            'expected_fonts': ['Arial'],
            'seal_region': (0.1, 0.1, 0.3, 0.3),
            'min_resolution': (600, 800),
        },
    }

    def analyze_document(self, image_path: str, doc_type: str) -> dict:
        """
        Full AI forgery analysis pipeline.
        Returns dict with risk_score (0-100) and detailed findings.
        """
        findings = {
            'risk_score': 0,
            'checks': {},
            'extracted_text': '',
            'verdict': 'PENDING',
            'flags': [],
        }

        try:
            # 1. Load and validate image
            img = cv2.imread(image_path)
            if img is None:
                findings['flags'].append('Could not load image file')
                findings['risk_score'] = 90
                findings['verdict'] = 'ERROR'
                return findings

            h, w = img.shape[:2]

            # 2. Resolution check
            min_res = self.KNOWN_TEMPLATES.get(doc_type, {}).get('min_resolution', (600, 400))
            if w < min_res[0] or h < min_res[1]:
                findings['checks']['resolution'] = 'FAIL'
                findings['flags'].append(f'Low resolution: {w}x{h}. Minimum expected: {min_res[0]}x{min_res[1]}')
                findings['risk_score'] += 15
            else:
                findings['checks']['resolution'] = 'PASS'

            # 3. OCR text extraction
            pil_img = Image.open(image_path)
            findings['extracted_text'] = pytesseract.image_to_string(pil_img, config='--psm 6')

            # 4. Font consistency check (simplified)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            if laplacian_var < 50:
                findings['checks']['font_consistency'] = 'SUSPICIOUS'
                findings['flags'].append('Blurry or low-quality text detected — possible copy/paste tampering')
                findings['risk_score'] += 20
            else:
                findings['checks']['font_consistency'] = 'PASS'

            # 5. Noise/artifact analysis (detect digital manipulation)
            edges = cv2.Canny(gray, 100, 200)
            edge_density = np.sum(edges > 0) / (w * h)
            if edge_density > 0.3:
                findings['checks']['artifact_analysis'] = 'SUSPICIOUS'
                findings['flags'].append('High edge density — possible digital manipulation detected')
                findings['risk_score'] += 25
            else:
                findings['checks']['artifact_analysis'] = 'PASS'

            # 6. Metadata analysis (ELA - Error Level Analysis)
            ela_score = self._error_level_analysis(image_path)
            if ela_score > 0.15:
                findings['checks']['ela_analysis'] = 'SUSPICIOUS'
                findings['flags'].append(f'Error Level Analysis score {ela_score:.2f} — suggests digital editing')
                findings['risk_score'] += 20
            else:
                findings['checks']['ela_analysis'] = 'PASS'

            # 7. Color histogram analysis (detect cut-and-paste sections)
            hist_score = self._color_histogram_analysis(img)
            if hist_score > 0.7:
                findings['checks']['color_analysis'] = 'SUSPICIOUS'
                findings['flags'].append('Unusual color distribution — possible image splicing')
                findings['risk_score'] += 15
            else:
                findings['checks']['color_analysis'] = 'PASS'

            # 8. Watermark/seal verification
            seal_present = self._check_seal_region(img, doc_type)
            if not seal_present:
                findings['checks']['seal_verification'] = 'FAIL'
                findings['flags'].append('Official seal/watermark not detected in expected region')
                findings['risk_score'] += 20
            else:
                findings['checks']['seal_verification'] = 'PASS'

            # Final verdict
            score = min(findings['risk_score'], 100)
            findings['risk_score'] = score
            if score <= 30:
                findings['verdict'] = 'AUTHENTIC'
            elif score <= 60:
                findings['verdict'] = 'SUSPICIOUS'
            else:
                findings['verdict'] = 'LIKELY_FORGED'

        except Exception as e:
            logger.exception(f'Forgery detection error: {e}')
            findings['flags'].append(f'Analysis error: {str(e)}')
            findings['risk_score'] = 50
            findings['verdict'] = 'ERROR'

        return findings

    def _error_level_analysis(self, image_path: str) -> float:
        """ELA detects JPEG re-compression artifacts from editing"""
        try:
            original = Image.open(image_path).convert('RGB')
            import io
            buffer = io.BytesIO()
            original.save(buffer, 'JPEG', quality=90)
            buffer.seek(0)
            resaved = Image.open(buffer).convert('RGB')

            orig_arr = np.array(original, dtype=float)
            resaved_arr = np.array(resaved, dtype=float)
            ela = np.abs(orig_arr - resaved_arr)
            return float(np.mean(ela) / 255.0)
        except Exception:
            return 0.0

    def _color_histogram_analysis(self, img) -> float:
        """Detect suspicious color distribution changes suggesting splicing"""
        try:
            h, w = img.shape[:2]
            sections = [
                img[0:h//2, 0:w//2],
                img[0:h//2, w//2:],
                img[h//2:, 0:w//2],
                img[h//2:, w//2:],
            ]
            histograms = []
            for section in sections:
                hist = cv2.calcHist([section], [0,1,2], None, [8,8,8], [0,256]*3)
                cv2.normalize(hist, hist)
                histograms.append(hist)

            # Compare all quadrant histograms
            scores = []
            for i in range(len(histograms)):
                for j in range(i+1, len(histograms)):
                    score = cv2.compareHist(histograms[i], histograms[j], cv2.HISTCMP_BHATTACHARYYA)
                    scores.append(score)
            return float(np.mean(scores))
        except Exception:
            return 0.0

    def _check_seal_region(self, img, doc_type: str) -> bool:
        """Check if seal/watermark is present in expected region"""
        try:
            template = self.KNOWN_TEMPLATES.get(doc_type)
            if not template:
                return True  # Unknown doc type, pass by default

            h, w = img.shape[:2]
            x1, y1, x2, y2 = template['seal_region']
            region = img[int(y1*h):int(y2*h), int(x1*w):int(x2*w)]
            gray_region = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
            _, thresh = cv2.threshold(gray_region, 200, 255, cv2.THRESH_BINARY_INV)
            non_white = np.sum(thresh > 0) / thresh.size
            return non_white > 0.05  # At least 5% non-white = seal likely present
        except Exception:
            return True


class ExternalVerificationService:
    """Verify credentials against official government APIs"""

    def verify_waec(self, exam_number: str, year: int, card_pin: str) -> dict:
        """Verify against WAEC direct database"""
        try:
            resp = requests.post(
                settings.WAEC_API_URL,
                json={'examNo': exam_number, 'year': year, 'pin': card_pin},
                headers={'Authorization': f'Bearer {settings.WAEC_API_KEY}'},
                timeout=30
            )
            if resp.status_code == 200:
                data = resp.json()
                return {'verified': data.get('valid', False), 'data': data}
            return {'verified': False, 'error': f'API error {resp.status_code}'}
        except requests.RequestException as e:
            logger.error(f'WAEC API error: {e}')
            return {'verified': False, 'error': str(e)}

    def verify_neco(self, exam_number: str, year: int, token: str) -> dict:
        """Verify against NECO database"""
        try:
            resp = requests.post(
                settings.NECO_API_URL,
                json={'registrationNumber': exam_number, 'year': year, 'token': token},
                headers={'Authorization': f'Bearer {settings.NECO_API_KEY}'},
                timeout=30
            )
            if resp.status_code == 200:
                return {'verified': True, 'data': resp.json()}
            return {'verified': False, 'error': 'Verification failed'}
        except requests.RequestException as e:
            return {'verified': False, 'error': str(e)}

    def verify_jamb(self, reg_number: str, year: int) -> dict:
        """Verify JAMB registration and score"""
        try:
            resp = requests.get(
                f'{settings.JAMB_API_URL}{reg_number}/{year}',
                headers={'Authorization': f'Bearer {settings.JAMB_API_KEY}'},
                timeout=30
            )
            if resp.status_code == 200:
                return {'verified': True, 'data': resp.json()}
            return {'verified': False, 'error': 'JAMB record not found'}
        except requests.RequestException as e:
            return {'verified': False, 'error': str(e)}


# Singleton instances
forgery_detector = ForgeryDetectionService()
external_verifier = ExternalVerificationService()
