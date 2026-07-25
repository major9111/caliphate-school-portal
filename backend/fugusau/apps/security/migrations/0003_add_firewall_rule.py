from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid

class Migration(migrations.Migration):
    dependencies = [
        ('security', '0002_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.CreateModel(
            name='FirewallRule',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('action', models.CharField(choices=[('allow','Allow'),('deny','Deny'),('log','Log Only')], default='deny', max_length=10)),
                ('protocol', models.CharField(choices=[('tcp','TCP'),('udp','UDP'),('icmp','ICMP'),('any','Any')], default='any', max_length=10)),
                ('direction', models.CharField(choices=[('inbound','Inbound'),('outbound','Outbound'),('both','Both')], default='inbound', max_length=10)),
                ('source_ip', models.CharField(blank=True, max_length=50)),
                ('dest_ip', models.CharField(blank=True, max_length=50)),
                ('source_port', models.CharField(blank=True, max_length=20)),
                ('dest_port', models.CharField(blank=True, max_length=20)),
                ('priority', models.IntegerField(default=100)),
                ('is_active', models.BooleanField(default=True)),
                ('hit_count', models.BigIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='firewall_rules', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'security_firewall_rules', 'ordering': ['priority', '-created_at']},
        ),
    ]
