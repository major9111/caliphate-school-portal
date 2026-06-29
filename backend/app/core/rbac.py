"""Role-Based Access Control System."""
from enum import Enum
from typing import List
from fastapi import Depends, HTTPException, status
from app.core.dependencies import get_current_active_user
from app.models.user import User


class Role(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"
    PARENT = "parent"


ROLE_PERMISSIONS = {
    Role.SUPER_ADMIN: ["manage_users", "manage_settings", "manage_finance", "manage_academics",
                       "manage_cms", "view_audit_logs", "manage_transport", "manage_payroll"],
    Role.ADMIN: ["manage_users", "manage_finance", "manage_academics", "manage_cms",
                 "manage_transport", "view_audit_logs"],
    Role.TEACHER: ["manage_academics", "view_students", "manage_homework", "view_attendance"],
    Role.STUDENT: ["view_own_results", "view_own_homework", "view_own_attendance"],
    Role.PARENT: ["view_child_results", "view_child_homework", "view_child_attendance", "pay_fees"],
}


def require_role(allowed_roles: List[Role]):
    def role_checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role not in [r.value for r in allowed_roles]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user
    return role_checker


def require_permission(permission: str):
    def permission_checker(current_user: User = Depends(get_current_active_user)):
        user_role = Role(current_user.role) if current_user.role in Role._value2member_map_ else None
        if not user_role:
            raise HTTPException(status_code=403, detail="Invalid user role")
        if permission not in ROLE_PERMISSIONS.get(user_role, []):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Permission '{permission}' required")
        return current_user
    return permission_checker


is_super_admin = require_role([Role.SUPER_ADMIN])
is_admin_or_above = require_role([Role.SUPER_ADMIN, Role.ADMIN])
is_teacher_or_above = require_role([Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER])
