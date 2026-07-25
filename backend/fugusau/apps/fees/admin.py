"""FUGUSAU Portal — Fees Admin"""
from django.contrib import admin
from .models import FeeType, Invoice, Payment

@admin.register(FeeType)
class FeeTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'amount', 'session', 'is_mandatory']
    list_filter = ['category', 'session', 'is_mandatory']

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_no', 'student', 'total_amount', 'amount_paid', 'status', 'due_date']
    list_filter = ['status']
    search_fields = ['invoice_no', 'student__matric_number']

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['transaction_ref', 'invoice', 'amount', 'gateway', 'is_verified', 'payment_date']
    list_filter = ['gateway', 'is_verified']
    search_fields = ['transaction_ref']
