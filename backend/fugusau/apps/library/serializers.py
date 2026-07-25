"""FUGUSAU Portal — Library Serializers"""
from rest_framework import serializers
from .models import BookCategory, Book, BorrowRecord


class BookCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BookCategory
        fields = ['id', 'name', 'description']
        read_only_fields = ['id']


class BookSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    status = serializers.ReadOnlyField()

    class Meta:
        model = Book
        fields = [
            'id', 'title', 'author', 'isbn', 'category', 'category_name',
            'publisher', 'edition', 'year', 'total_copies', 'available_copies',
            'shelf_location', 'cover_image', 'description', 'status', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'available_copies', 'created_at']


class BorrowRecordSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book.title', read_only=True)
    book_author = serializers.CharField(source='book.author', read_only=True)
    borrower_name = serializers.CharField(source='borrower.get_full_name', read_only=True)
    issued_by_name = serializers.SerializerMethodField()

    class Meta:
        model = BorrowRecord
        fields = [
            'id', 'book', 'book_title', 'book_author',
            'borrower', 'borrower_name', 'borrowed_at', 'due_date',
            'returned_at', 'status', 'issued_by', 'issued_by_name',
            'fine_amount', 'fine_paid', 'notes',
        ]
        read_only_fields = ['id', 'borrowed_at', 'returned_at', 'fine_amount']

    def get_issued_by_name(self, obj):
        return obj.issued_by.get_full_name() if obj.issued_by else None
