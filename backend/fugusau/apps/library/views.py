"""FUGUSAU Portal — Library Views"""
from datetime import timedelta
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from fugusau.apps.permissions import IsAdmin, IsAdminOrLecturer
from .models import BookCategory, Book, BorrowRecord
from .serializers import BookCategorySerializer, BookSerializer, BorrowRecordSerializer

BORROW_DAYS = 14  # default loan period


class BookCategoryListView(generics.ListCreateAPIView):
    queryset = BookCategory.objects.all()
    serializer_class = BookCategorySerializer

    def get_permissions(self):
        return [IsAdmin()] if self.request.method != 'GET' else [permissions.IsAuthenticated()]


class BookCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET / PATCH / DELETE /api/v1/library/categories/<pk>/"""
    serializer_class = BookCategorySerializer
    queryset         = BookCategory.objects.all()

    def get_permissions(self):
        return [IsAdmin()] if self.request.method != 'GET' else [permissions.IsAuthenticated()]


class BookListView(generics.ListCreateAPIView):
    serializer_class = BookSerializer
    filterset_fields = ['category', 'year', 'is_active']
    search_fields = ['title', 'author', 'isbn']

    def get_permissions(self):
        return [IsAdmin()] if self.request.method != 'GET' else [permissions.IsAuthenticated()]

    def get_queryset(self):
        return Book.objects.filter(is_active=True).select_related('category')


class BookDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Book.objects.all()
    serializer_class = BookSerializer

    def get_permissions(self):
        return [IsAdmin()] if self.request.method != 'GET' else [permissions.IsAuthenticated()]


class BorrowBookView(APIView):
    """POST /api/v1/library/borrow/ — Issue a book to a user (admin/librarian)"""
    permission_classes = [IsAdminOrLecturer]

    def post(self, request):
        book_id = request.data.get('book_id')
        borrower_id = request.data.get('borrower_id')
        days = int(request.data.get('days', BORROW_DAYS))

        book = get_object_or_404(Book, id=book_id, is_active=True)
        if book.available_copies < 1:
            return Response({'error': 'No copies available.'}, status=400)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        borrower = get_object_or_404(User, id=borrower_id)

        active = BorrowRecord.objects.filter(borrower=borrower, book=book, status='borrowed').exists()
        if active:
            return Response({'error': 'User already has this book borrowed.'}, status=400)

        record = BorrowRecord.objects.create(
            book=book,
            borrower=borrower,
            due_date=timezone.now().date() + timedelta(days=days),
            issued_by=request.user,
        )
        book.available_copies -= 1
        book.save(update_fields=['available_copies'])

        return Response(BorrowRecordSerializer(record).data, status=201)


class ReturnBookView(APIView):
    """POST /api/v1/library/return/<record_id>/ — Process a book return"""
    permission_classes = [IsAdminOrLecturer]

    def post(self, request, pk):
        record = get_object_or_404(BorrowRecord, id=pk, status='borrowed')
        now = timezone.now()
        record.returned_at = now
        record.status = 'returned'

        # Calculate overdue fine (₦50/day)
        if now.date() > record.due_date:
            overdue_days = (now.date() - record.due_date).days
            record.fine_amount = overdue_days * 50
            record.status = 'overdue'

        record.save()
        record.book.available_copies += 1
        record.book.save(update_fields=['available_copies'])

        return Response(BorrowRecordSerializer(record).data)


class MyBorrowsView(generics.ListAPIView):
    """GET /api/v1/library/my-borrows/ — Current user's borrow history"""
    serializer_class = BorrowRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BorrowRecord.objects.filter(
            borrower=self.request.user
        ).select_related('book').order_by('-borrowed_at')


class AllBorrowsView(generics.ListAPIView):
    """GET /api/v1/library/borrows/ — All borrow records (admin)"""
    serializer_class = BorrowRecordSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['status', 'borrower', 'book']

    def get_queryset(self):
        return BorrowRecord.objects.select_related('book', 'borrower').order_by('-borrowed_at')
