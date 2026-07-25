"""FUGUSAU Portal — Library Admin"""
from django.contrib import admin
from .models import BookCategory, Book, BorrowRecord

@admin.register(BookCategory)
class BookCategoryAdmin(admin.ModelAdmin):
    list_display = ['name']

@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'isbn', 'category', 'total_copies', 'available_copies', 'is_active']
    list_filter = ['category', 'is_active', 'year']
    search_fields = ['title', 'author', 'isbn']

@admin.register(BorrowRecord)
class BorrowRecordAdmin(admin.ModelAdmin):
    list_display = ['book', 'borrower', 'borrowed_at', 'due_date', 'status', 'fine_amount', 'fine_paid']
    list_filter = ['status', 'fine_paid']
    search_fields = ['book__title', 'borrower__email']
