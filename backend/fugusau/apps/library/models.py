"""FUGUSAU Portal — Library App Models"""
import uuid
from django.db import models
from django.conf import settings


class BookCategory(models.Model):
    id   = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'book_categories'
        verbose_name_plural = 'Book Categories'

    def __str__(self): return self.name


class Book(models.Model):
    AVAILABLE   = 'available'
    BORROWED    = 'borrowed'
    RESERVED    = 'reserved'
    MAINTENANCE = 'maintenance'

    STATUS_CHOICES = [
        (AVAILABLE, 'Available'), (BORROWED, 'Borrowed'),
        (RESERVED, 'Reserved'), (MAINTENANCE, 'Maintenance'),
    ]

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title         = models.CharField(max_length=400)
    author        = models.CharField(max_length=300)
    isbn          = models.CharField(max_length=20, unique=True, blank=True)
    category      = models.ForeignKey(BookCategory, on_delete=models.SET_NULL, null=True, related_name='books')
    publisher     = models.CharField(max_length=200, blank=True)
    edition       = models.CharField(max_length=50, blank=True)
    year          = models.IntegerField(blank=True, null=True)
    total_copies  = models.PositiveIntegerField(default=1)
    available_copies = models.PositiveIntegerField(default=1)
    shelf_location = models.CharField(max_length=50, blank=True)
    cover_image   = models.ImageField(upload_to='library/covers/', blank=True, null=True)
    description   = models.TextField(blank=True)
    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'books'
        ordering = ['title']

    def __str__(self): return f'{self.title} — {self.author}'

    @property
    def status(self):
        if self.available_copies > 0:
            return self.AVAILABLE
        return self.BORROWED


class BorrowRecord(models.Model):
    BORROWED  = 'borrowed'
    RETURNED  = 'returned'
    OVERDUE   = 'overdue'

    STATUS_CHOICES = [
        (BORROWED, 'Borrowed'), (RETURNED, 'Returned'), (OVERDUE, 'Overdue'),
    ]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    book        = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='borrow_records')
    borrower    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='borrowed_books')
    borrowed_at = models.DateTimeField(auto_now_add=True)
    due_date    = models.DateField()
    returned_at = models.DateTimeField(blank=True, null=True)
    status      = models.CharField(max_length=10, choices=STATUS_CHOICES, default=BORROWED)
    issued_by   = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='issued_books'
    )
    fine_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    fine_paid   = models.BooleanField(default=False)
    notes       = models.TextField(blank=True)

    class Meta:
        db_table = 'borrow_records'
        ordering = ['-borrowed_at']

    def __str__(self):
        return f'{self.book.title} → {self.borrower.get_full_name()}'
