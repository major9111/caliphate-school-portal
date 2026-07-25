"""FUGUSAU Portal — Admissions Serializers"""
from rest_framework import serializers
from django.utils import timezone
from .models import Application, ApplicationDocument, AdmissionOffer, AdmissionSession, ApplicationStatusHistory


class AdmissionSessionSerializer(serializers.ModelSerializer):
    is_open         = serializers.ReadOnlyField()
    slots_remaining = serializers.ReadOnlyField()

    class Meta:
        model  = AdmissionSession
        fields = '__all__'


class ApplicationDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ApplicationDocument
        fields = ['id', 'doc_type', 'file', 'filename', 'verified', 'uploaded_at', 'notes']
        read_only_fields = ['id', 'uploaded_at', 'verified']


class ApplicationStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = ApplicationStatusHistory
        fields = ['id', 'from_status', 'to_status', 'changed_by', 'changed_by_name', 'reason', 'timestamp']
        read_only_fields = fields

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.get_full_name()
        return 'System / Applicant'


class ApplicationListSerializer(serializers.ModelSerializer):
    """Lightweight for list views"""
    full_name              = serializers.SerializerMethodField()
    first_choice_dept_name = serializers.SerializerMethodField()
    offered_dept_name      = serializers.SerializerMethodField()
    days_to_respond        = serializers.ReadOnlyField()
    is_offer_expired       = serializers.ReadOnlyField()

    class Meta:
        model  = Application
        fields = [
            'id', 'application_no', 'full_name', 'email', 'phone',
            'gender', 'state_of_origin', 'lga', 'status',
            'programme', 'entry_type',
            'jamb_reg_no', 'jamb_score', 'jamb_year', 'post_utme_score', 'aggregate_score',
            'waec_exam_no', 'neco_exam_no',
            'first_choice_dept', 'first_choice_dept_name',
            'second_choice_dept',
            'offered_department', 'offered_dept_name',
            'meets_jamb_cutoff', 'meets_subject_reqs', 'credentials_verified',
            'submitted_at', 'offered_at', 'offer_expires_at',
            'days_to_respond', 'is_offer_expired',
        ]

    def get_full_name(self, obj):              return obj.get_full_name()
    def get_first_choice_dept_name(self, obj): return obj.first_choice_dept.name if obj.first_choice_dept else ''
    def get_offered_dept_name(self, obj):      return obj.offered_department.name if obj.offered_department else ''


class ApplicationDetailSerializer(serializers.ModelSerializer):
    """Full detail with nested documents and history"""
    full_name    = serializers.SerializerMethodField()
    documents    = ApplicationDocumentSerializer(many=True, read_only=True)
    history      = ApplicationStatusHistorySerializer(many=True, read_only=True)
    offer        = serializers.SerializerMethodField()
    days_to_respond  = serializers.ReadOnlyField()
    is_offer_expired = serializers.ReadOnlyField()
    first_choice_dept_name  = serializers.SerializerMethodField()
    second_choice_dept_name = serializers.SerializerMethodField()
    offered_dept_name       = serializers.SerializerMethodField()
    reviewed_by_name        = serializers.SerializerMethodField()

    class Meta:
        model  = Application
        fields = '__all__'
        read_only_fields = [
            'id', 'application_no', 'submitted_at', 'updated_at',
            'offered_at', 'offer_expires_at', 'response_at',
            'aggregate_score', 'meets_jamb_cutoff', 'meets_subject_reqs',
        ]

    def get_full_name(self, obj):               return obj.get_full_name()
    def get_first_choice_dept_name(self, obj):  return obj.first_choice_dept.name if obj.first_choice_dept else ''
    def get_second_choice_dept_name(self, obj): return obj.second_choice_dept.name if obj.second_choice_dept else ''
    def get_offered_dept_name(self, obj):       return obj.offered_department.name if obj.offered_department else ''
    def get_reviewed_by_name(self, obj):        return obj.reviewed_by.get_full_name() if obj.reviewed_by else ''
    def get_offer(self, obj):
        try:
            return AdmissionOfferSerializer(obj.offer).data
        except AdmissionOffer.DoesNotExist:
            return None


class ApplicationCreateSerializer(serializers.ModelSerializer):
    """Used by applicants to submit a new application"""
    class Meta:
        model  = Application
        fields = [
            'first_name', 'middle_name', 'last_name', 'email', 'phone',
            'date_of_birth', 'gender', 'state_of_origin', 'lga',
            'home_address', 'programme', 'entry_type',
            'first_choice_dept', 'second_choice_dept',
            'jamb_reg_no', 'jamb_score', 'jamb_year',
            'waec_exam_no', 'neco_exam_no', 'o_level_results',
        ]

    def validate_jamb_score(self, value):
        if value < 0 or value > 400:
            raise serializers.ValidationError('JAMB score must be between 0 and 400.')
        return value

    def validate(self, data):
        # Check session is open
        from .models import AdmissionSession
        session = AdmissionSession.objects.filter(is_active=True).first()
        if not session or not session.is_open:
            raise serializers.ValidationError('Admission is not currently open.')
        if session.slots_remaining <= 0:
            raise serializers.ValidationError('All admission slots are filled for this session.')
        return data

    def create(self, validated_data):
        from .models import AdmissionSession
        import uuid as _uuid
        session = AdmissionSession.objects.filter(is_active=True).first()
        app_no  = f'FUGU/{session.session_name.replace("/","")}/{_uuid.uuid4().hex[:6].upper()}'

        # Auto-calculate aggregate score (JAMB 60% + Post-UTME 40%)
        jamb = validated_data.get('jamb_score', 0)
        post_utme = validated_data.get('post_utme_score')
        aggregate = None
        if post_utme is not None:
            aggregate = round((jamb / 400 * 60) + (float(post_utme) / 100 * 40), 2)

        application = Application.objects.create(
            **validated_data,
            session=session,
            application_no=app_no,
            aggregate_score=aggregate,
        )

        # Auto-check qualifications
        application.meets_jamb_cutoff = jamb >= 160
        application.save(update_fields=['meets_jamb_cutoff'])

        # Log status history
        ApplicationStatusHistory.objects.create(
            application=application,
            from_status='',
            to_status=Application.SUBMITTED,
            reason='Application submitted by applicant',
        )

        return application


class AdmissionOfferSerializer(serializers.ModelSerializer):
    department_name = serializers.SerializerMethodField()
    issued_by_name  = serializers.SerializerMethodField()

    class Meta:
        model  = AdmissionOffer
        fields = '__all__'

    def get_department_name(self, obj): return obj.department.name if obj.department else ''
    def get_issued_by_name(self, obj):  return obj.issued_by.get_full_name() if obj.issued_by else ''


class OfferResponseSerializer(serializers.Serializer):
    """Applicant accepting or declining an offer"""
    response       = serializers.ChoiceField(choices=['accepted', 'declined'])
    decline_reason = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate(self, data):
        if data['response'] == 'declined' and not data.get('decline_reason'):
            raise serializers.ValidationError({'decline_reason': 'Please provide a reason for declining.'})
        return data


class BulkActionSerializer(serializers.Serializer):
    """Admin bulk action on multiple applications"""
    application_ids = serializers.ListField(
        child=serializers.UUIDField(), min_length=1, max_length=200
    )
    action  = serializers.ChoiceField(choices=[
        'shortlist', 'offer', 'reject', 'waitlist'
    ])
    reason  = serializers.CharField(required=False, allow_blank=True)
    offer_validity_days = serializers.IntegerField(required=False, default=14)
