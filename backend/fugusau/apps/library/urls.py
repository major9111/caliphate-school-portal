"""FUGUSAU Portal — Library URLs"""
from django.urls import path
from .views import (
    BookCategoryListView, BookCategoryDetailView,
    BookListView, BookDetailView,
    BorrowBookView, ReturnBookView, MyBorrowsView, AllBorrowsView,
)

urlpatterns = [
    path('',                        BookListView.as_view(),         name='book-list'),
    path('<uuid:pk>/',              BookDetailView.as_view(),       name='book-detail'),
    path('categories/',             BookCategoryListView.as_view(),     name='book-categories'),
    path('categories/<uuid:pk>/',   BookCategoryDetailView.as_view(),   name='book-category-detail'),
    path('borrow/',                 BorrowBookView.as_view(),       name='borrow-book'),
    path('return/<uuid:pk>/',       ReturnBookView.as_view(),       name='return-book'),
    path('my-borrows/',             MyBorrowsView.as_view(),        name='my-borrows'),
    path('borrows/',                AllBorrowsView.as_view(),       name='all-borrows'),
]
