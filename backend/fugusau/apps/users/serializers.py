"""FUGUSAU Portal — Users Serializers"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import AuditLog

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """JWT token with extra user info embedded"""
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['role']  = user.role
        token['name']  = user.get_full_name()
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data['user'] = {
            'id':    str(user.id),
            'email': user.email,
            'name':  user.get_full_name(),
            'role':  user.role,
            'is_verified': user.is_verified,
            'two_fa_enabled': user.two_fa_enabled,
            'profile_photo': user.profile_photo.url if user.profile_photo else None,
        }
        return data


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    # `name` mirrors the login-response field so the frontend User type stays consistent
    name      = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'middle_name', 'last_name',
            'name', 'full_name', 'role', 'phone', 'profile_photo',
            'date_of_birth', 'gender', 'is_active', 'is_verified',
            'two_fa_enabled', 'date_joined', 'last_seen',
        ]
        read_only_fields = ['id', 'email', 'role', 'date_joined', 'is_verified']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_name(self, obj):
        return obj.get_full_name()


class UserCreateSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'middle_name', 'last_name',
            'role', 'phone', 'password', 'password2',
        ]

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    new_password2 = serializers.CharField(required=True)

    def validate(self, data):
        if data['new_password'] != data['new_password2']:
            raise serializers.ValidationError({'new_password': 'Passwords do not match.'})
        return data


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'user_name', 'action', 'description',
                  'ip_address', 'timestamp', 'extra_data']
        read_only_fields = fields

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else 'System'
