from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

DEFAULT_EMAIL = "admin@perfmonitor.local"
DEFAULT_USERNAME = "admin"
DEFAULT_PASSWORD = "Admin@12345"


class Command(BaseCommand):
    help = "Create a default admin user if one does not already exist"

    def add_arguments(self, parser):
        parser.add_argument("--email", default=DEFAULT_EMAIL)
        parser.add_argument("--username", default=DEFAULT_USERNAME)
        parser.add_argument("--password", default=DEFAULT_PASSWORD)

    def handle(self, *args, **options):
        email = options["email"]
        username = options["username"]
        password = options["password"]

        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(
                f"Admin user '{email}' already exists. Skipping creation."
            ))
            return

        user = User.objects.create_superuser(
            email=email,
            username=username,
            password=password,
            role="admin",
        )
        self.stdout.write(self.style.SUCCESS(
            f"\n✅ Admin user created successfully!\n"
            f"   Email    : {user.email}\n"
            f"   Username : {user.username}\n"
            f"   Password : {password}\n"
            f"   Role     : {user.role}\n"
        ))
