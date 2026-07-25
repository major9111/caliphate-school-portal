"""
FUGUSAU Portal — Global Search

Real full-text search (ranked, typo-tolerant-ish via websearch syntax,
weighted by field importance) using PostgreSQL's built-in search
(SearchVector / SearchQuery / SearchRank). No Elasticsearch cluster, no new
infrastructure, no extra hosting cost — this runs on the same Postgres
database (e.g. Neon) the app already uses.

Only searches content that's safe to expose without authentication
(courses, departments, library catalog). Student/staff directories are
deliberately excluded here for privacy — those already have their own
authenticated search via DRF's SearchFilter on the admin endpoints.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank

from fugusau.apps.courses.models import Course
from fugusau.apps.students.models import Department
from fugusau.apps.library.models import Book

SEARCHABLE_TYPES = {'course', 'department', 'book'}


class GlobalSearchView(APIView):
    """
    GET /api/v1/search/?q=chemistry&type=course,department,book&limit=8

    - q: search text (required, min 2 chars)
    - type: comma-separated subset of course,department,book (default: all)
    - limit: max results per type, capped at 25 (default 8)
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q or len(q) < 2:
            return Response({'results': [], 'query': q})

        requested_types = {
            t.strip() for t in request.query_params.get('type', ','.join(SEARCHABLE_TYPES)).split(',')
            if t.strip() in SEARCHABLE_TYPES
        } or SEARCHABLE_TYPES

        try:
            limit = min(int(request.query_params.get('limit', 8) or 8), 25)
        except (TypeError, ValueError):
            limit = 8

        query = SearchQuery(q, search_type='websearch')
        results = []

        if 'course' in requested_types:
            vector = SearchVector('code', weight='A') + SearchVector('title', weight='A') + SearchVector('description', weight='B')
            qs = (Course.objects.filter(is_active=True)
                  .annotate(rank=SearchRank(vector, query))
                  .filter(rank__gt=0)
                  .select_related('department')
                  .order_by('-rank')[:limit])
            for c in qs:
                results.append({
                    'type': 'course', 'id': str(c.id),
                    'title': f'{c.code} — {c.title}',
                    'subtitle': f'{c.department.name} · {c.get_level_display()} · {c.credit_units} units',
                    'url': f'/courses?course={c.id}',
                    'rank': float(c.rank),
                })

        if 'department' in requested_types:
            vector = SearchVector('name', weight='A') + SearchVector('code', weight='B')
            qs = (Department.objects.annotate(rank=SearchRank(vector, query))
                  .filter(rank__gt=0)
                  .select_related('faculty')
                  .order_by('-rank')[:limit])
            for d in qs:
                results.append({
                    'type': 'department', 'id': str(d.id),
                    'title': d.name,
                    'subtitle': f'{d.faculty.name} · {d.code}',
                    'url': f'/admission?department={d.id}',
                    'rank': float(d.rank),
                })

        if 'book' in requested_types:
            vector = SearchVector('title', weight='A') + SearchVector('author', weight='B') + SearchVector('publisher', weight='C')
            qs = (Book.objects.annotate(rank=SearchRank(vector, query))
                  .filter(rank__gt=0)
                  .order_by('-rank')[:limit])
            for b in qs:
                subtitle = b.author
                if b.year:
                    subtitle += f' · {b.year}'
                results.append({
                    'type': 'book', 'id': str(b.id),
                    'title': b.title,
                    'subtitle': subtitle,
                    'url': f'/library?book={b.id}',
                    'available': b.available_copies > 0,
                    'rank': float(b.rank),
                })

        results.sort(key=lambda r: r['rank'], reverse=True)
        return Response({'results': results[:limit], 'query': q})
