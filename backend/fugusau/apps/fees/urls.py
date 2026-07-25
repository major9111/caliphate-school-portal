"""FUGUSAU Portal — Fees URLs"""
from django.urls import path
from .views import (
    FeeTypeListView, InvoiceListView, GenerateInvoiceView,
    InitiatePaymentView, VerifyPaymentView, PaymentHistoryView,
)

urlpatterns = [
    path('types/',              FeeTypeListView.as_view(),      name='fee-types'),
    path('invoices/',           InvoiceListView.as_view(),      name='invoices'),
    path('generate-invoice/',   GenerateInvoiceView.as_view(),  name='generate-invoice'),
    path('pay/',                InitiatePaymentView.as_view(),  name='initiate-payment'),
    path('verify-payment/',     VerifyPaymentView.as_view(),    name='verify-payment'),
    path('payment-history/',    PaymentHistoryView.as_view(),   name='payment-history'),
]
