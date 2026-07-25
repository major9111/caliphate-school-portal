"""FUGUSAU Portal — Hostel Views"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from fugusau.apps.permissions import IsAdmin, IsStudent
from fugusau.apps.courses.models import AcademicSession
from .models import Hostel, Room, HostelAllocation
from .serializers import HostelSerializer, RoomSerializer, HostelAllocationSerializer


class HostelListView(generics.ListCreateAPIView):
    serializer_class = HostelSerializer
    filterset_fields = ['gender', 'is_active']

    def get_permissions(self):
        return [IsAdmin()] if self.request.method != 'GET' else [permissions.IsAuthenticated()]

    def get_queryset(self):
        return Hostel.objects.prefetch_related('rooms').filter(is_active=True)


class HostelDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = HostelSerializer
    queryset = Hostel.objects.all()

    def get_permissions(self):
        return [IsAdmin()] if self.request.method != 'GET' else [permissions.IsAuthenticated()]


class RoomListView(generics.ListCreateAPIView):
    serializer_class = RoomSerializer

    def get_permissions(self):
        return [IsAdmin()] if self.request.method != 'GET' else [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = Room.objects.select_related('hostel')
        hostel_id = self.request.query_params.get('hostel')
        if hostel_id:
            qs = qs.filter(hostel__id=hostel_id)
        available = self.request.query_params.get('available')
        if available:
            qs = qs.filter(is_occupied=False, is_active=True)
        return qs


class ApplyForHostelView(APIView):
    """POST /api/v1/hostel/apply/ — Student applies for hostel room"""
    permission_classes = [IsStudent]

    def post(self, request):
        room_id = request.data.get('room_id')
        session = get_object_or_404(AcademicSession, is_current=True)
        student = request.user.student_profile
        room = get_object_or_404(Room, id=room_id, is_active=True, is_occupied=False)

        existing = HostelAllocation.objects.filter(student=student, session=session).first()
        if existing:
            return Response({'error': 'You already have a hostel allocation for this session.'}, status=400)

        allocation = HostelAllocation.objects.create(
            student=student, room=room, session=session, status='pending'
        )
        return Response(HostelAllocationSerializer(allocation).data, status=201)


class AllocationListView(generics.ListAPIView):
    """GET /api/v1/hostel/allocations/ — All allocations (admin)"""
    serializer_class = HostelAllocationSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['status', 'session', 'room__hostel']

    def get_queryset(self):
        return HostelAllocation.objects.select_related(
            'student__user', 'room__hostel', 'session'
        ).order_by('-allocated_at')


class MyAllocationView(generics.RetrieveAPIView):
    """GET /api/v1/hostel/my-allocation/ — Student's current allocation"""
    serializer_class = HostelAllocationSerializer
    permission_classes = [IsStudent]

    def get_object(self):
        session = get_object_or_404(AcademicSession, is_current=True)
        return get_object_or_404(
            HostelAllocation, student__user=self.request.user,
            session=session, status='approved'
        )


class ApproveAllocationView(APIView):
    """POST /api/v1/hostel/allocations/<pk>/approve/ — Admin approves allocation"""
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        allocation = get_object_or_404(HostelAllocation, id=pk, status='pending')
        allocation.status = 'approved'
        allocation.allocated_by = request.user
        allocation.save()
        allocation.room.is_occupied = True
        allocation.room.save(update_fields=['is_occupied'])
        return Response(HostelAllocationSerializer(allocation).data)


class VacateRoomView(APIView):
    """POST /api/v1/hostel/allocations/<pk>/vacate/ — Mark room as vacated"""
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        allocation = get_object_or_404(HostelAllocation, id=pk, status='approved')
        allocation.status = 'vacated'
        allocation.vacated_at = timezone.now()
        allocation.save()
        allocation.room.is_occupied = False
        allocation.room.save(update_fields=['is_occupied'])
        return Response({'detail': 'Room vacated successfully.'})


class HostelDeleteView(APIView):
    """DELETE /api/v1/hostel/<pk>/delete/"""
    permission_classes = [IsAdmin]

    def delete(self, request, pk):
        hostel = get_object_or_404(Hostel, id=pk)
        hostel.delete()
        return Response(status=204)


class RoomDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET / PATCH / DELETE /api/v1/hostel/rooms/<pk>/"""
    serializer_class   = RoomSerializer
    permission_classes = [IsAdmin]
    queryset           = Room.objects.select_related('hostel')

    def destroy(self, request, *args, **kwargs):
        room = self.get_object()
        if room.is_occupied:
            return Response({'error': 'Cannot delete an occupied room.'}, status=400)
        room.delete()
        return Response(status=204)


class RejectAllocationView(APIView):
    """POST /api/v1/hostel/allocations/<pk>/reject/"""
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        allocation = get_object_or_404(HostelAllocation, id=pk, status=HostelAllocation.PENDING)
        allocation.status  = HostelAllocation.REJECTED
        allocation.remarks = request.data.get('remarks', '')
        allocation.save()
        return Response(HostelAllocationSerializer(allocation).data)
