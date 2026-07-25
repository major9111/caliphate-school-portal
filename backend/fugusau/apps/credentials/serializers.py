"""FUGUSAU Portal — Credentials Serializers"""
from rest_framework import serializers
from .models import Credential


class CredentialSerializer(serializers.ModelSerializer):
    """Full serializer for Credential upload, list, and review views."""

    student_matric  = serializers.CharField(source='student.matric_number', read_only=True)
    student_name    = serializers.SerializerMethodField()
    doc_type_display = serializers.CharField(source='get_doc_type_display', read_only=True)
    status_display   = serializers.CharField(source='get_status_display',   read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = Credential
        fields = [
            'id',
            'doc_type', 'doc_type_display',
            'file', 'original_filename', 'file_hash',
            # AI analysis
            'forgery_risk_score', 'ai_verdict', 'ai_findings', 'extracted_text',
            # External verification
            'external_verified', 'external_data',
            # Review
            'status', 'status_display',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'review_notes',
            # Relations
            'student_matric', 'student_name',
            # Timestamps
            'uploaded_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'original_filename', 'file_hash',
            'forgery_risk_score', 'ai_verdict', 'ai_findings', 'extracted_text',
            'external_verified', 'external_data',
            'student_matric', 'student_name',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'uploaded_at', 'updated_at',
        ]

    def get_student_name(self, obj):
        return obj.student.user.get_full_name() if obj.student and obj.student.user else ''

    def get_reviewed_by_name(self, obj):
        return obj.reviewed_by.get_full_name() if obj.reviewed_by else ''


class CredentialUploadSerializer(serializers.ModelSerializer):
    """Minimal serializer used only for the upload POST endpoint."""

    class Meta:
        model  = Credential
        fields = ['doc_type', 'file']
