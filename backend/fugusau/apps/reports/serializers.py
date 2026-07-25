"""FUGUSAU Portal — Reports Serializers"""
from rest_framework import serializers


class TranscriptRequestSerializer(serializers.Serializer):
    matric_number = serializers.CharField()
    include_unapproved = serializers.BooleanField(default=False)


class DepartmentStatsSerializer(serializers.Serializer):
    department_id = serializers.UUIDField()
    session = serializers.CharField(required=False)


class FeeReportSerializer(serializers.Serializer):
    session = serializers.CharField()
    semester = serializers.CharField(required=False)
    status = serializers.ChoiceField(choices=['pending', 'paid', 'partial', 'overdue', 'all'], default='all')
