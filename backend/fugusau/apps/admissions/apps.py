from django.apps import AppConfig

class AdmissionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'fugusau.apps.admissions'
    verbose_name = 'Admissions'

    def ready(self):
        pass  # Signal imports would go here
