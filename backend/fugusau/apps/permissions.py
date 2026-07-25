"""
FUGUSAU Portal — Custom DRF Permissions
Reusable across all apps
"""
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Only admin users."""
    message = 'Admin access required.'

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsLecturer(BasePermission):
    """Only lecturers."""
    message = 'Lecturer access required.'

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'lecturer'


class IsStudent(BasePermission):
    """Only students."""
    message = 'Student access required.'

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'student'


class IsAdminOrLecturer(BasePermission):
    """Admins and lecturers."""
    message = 'Admin or Lecturer access required.'

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('admin', 'lecturer')


class IsAdminOrReadOnly(BasePermission):
    """Admins can write; authenticated users can read."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return request.user.role == 'admin'


class IsOwnerOrAdmin(BasePermission):
    """Object-level: owner or admin."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        owner = getattr(obj, 'user', getattr(obj, 'student', None))
        if owner is None:
            return False
        if hasattr(owner, 'user'):
            return owner.user == request.user
        return owner == request.user
