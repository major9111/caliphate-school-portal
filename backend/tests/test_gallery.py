"""Gallery — public listing, staff-only create/update/delete."""
import io


def test_gallery_list_is_public_no_auth_needed(client):
    r = client.get("/api/v1/system/gallery")
    assert r.status_code == 200
    assert "items" in r.json()


def test_gallery_create_requires_staff_auth(client):
    r = client.post("/api/v1/system/gallery", files={"file": ("t.jpg", b"fake", "image/jpeg")}, data={"caption": "Test"})
    assert r.status_code == 401


def test_gallery_create_update_delete_as_staff(client, admin_headers):
    r1 = client.post(
        "/api/v1/system/gallery",
        files={"file": ("photo.jpg", io.BytesIO(b"fakebytes"), "image/jpeg")},
        data={"caption": "Sports Day", "note": "Annual sports day", "category": "events"},
        headers=admin_headers,
    )
    assert r1.status_code == 200
    item = r1.json()
    assert item["caption"] == "Sports Day"
    assert item["category"] == "events"

    r2 = client.put(f"/api/v1/system/gallery/{item['id']}", json={"caption": "Sports Day 2026"}, headers=admin_headers)
    assert r2.status_code == 200
    assert r2.json()["caption"] == "Sports Day 2026"

    r3 = client.get("/api/v1/system/gallery")
    assert any(i["id"] == item["id"] for i in r3.json()["items"])

    r4 = client.delete(f"/api/v1/system/gallery/{item['id']}", headers=admin_headers)
    assert r4.status_code == 200

    r5 = client.put(f"/api/v1/system/gallery/{item['id']}", json={"caption": "Should 404"}, headers=admin_headers)
    assert r5.status_code == 404


def test_gallery_delete_nonexistent_404s(client, admin_headers):
    r = client.delete("/api/v1/system/gallery/does-not-exist", headers=admin_headers)
    assert r.status_code == 404
