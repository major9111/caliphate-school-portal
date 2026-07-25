"""FUGUSAU Portal — Fees Serializers"""
from rest_framework import serializers
from .models import FeeType, Invoice, Payment


class FeeTypeSerializer(serializers.ModelSerializer):
    session_name = serializers.CharField(source='session.name', read_only=True)

    class Meta:
        model = FeeType
        fields = [
            'id', 'name', 'category', 'amount', 'session', 'session_name',
            'semester', 'level', 'is_mandatory', 'description',
        ]
        read_only_fields = ['id']


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'invoice', 'amount', 'gateway', 'transaction_ref',
            'gateway_ref', 'is_verified', 'verified_at', 'payment_date', 'metadata',
        ]
        read_only_fields = ['id', 'is_verified', 'verified_at', 'payment_date']


class InvoiceSerializer(serializers.ModelSerializer):
    fee_types = FeeTypeSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    balance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    matric_number = serializers.CharField(source='student.matric_number', read_only=True)
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_no', 'student', 'student_name', 'matric_number',
            'fee_types', 'total_amount', 'amount_paid', 'balance', 'status',
            'due_date', 'generated_at', 'rrr', 'payments',
        ]
        read_only_fields = ['id', 'invoice_no', 'generated_at']
