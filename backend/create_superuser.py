import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

if not User.objects.filter(username='admin@gep.ma').exists():
    User.objects.create_superuser(
        username='admin@gep.ma',
        email='admin@gep.ma',
        password='Admin1234'
    )
    print('Superuser créé : admin@gep.ma / Admin1234!')
else:
    print('Superuser déjà existant.')