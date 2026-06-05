from django.db import models


class PVSystem(models.Model):
    system_id = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=100)
    capacity_kwc = models.FloatField()
    commissioning_date = models.DateField()
    inclination = models.FloatField(default=25)
    orientation = models.CharField(max_length=30, default='South')
    nb_strings = models.IntegerField(default=0)
    latitude = models.FloatField(default=0)
    longitude = models.FloatField(default=0)
    module_id_ref = models.CharField(max_length=20, default='')
    inverter_id_ref = models.CharField(max_length=20, default='')

    class Meta:
        ordering = ['system_id']

    def __str__(self):
        return f"{self.system_id} — {self.name}"


class Module(models.Model):
    module_id = models.CharField(max_length=20, primary_key=True)
    system = models.ForeignKey(
        PVSystem, on_delete=models.CASCADE, related_name='module'
    )
    brand = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    technology = models.CharField(max_length=50)
    power_wc = models.FloatField()
    nb_per_string = models.IntegerField(default=0)
    voc_v = models.FloatField(default=0)
    isc_a = models.FloatField(default=0)
    temp_coeff_pmax = models.FloatField(default=0)

    def __str__(self):
        return f"{self.brand} {self.model}"


class Inverter(models.Model):
    inverter_id = models.CharField(max_length=20, primary_key=True)
    system = models.ForeignKey(
        PVSystem, on_delete=models.CASCADE, related_name='inverter'
    )
    brand = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    power_kw_ac = models.FloatField()
    nb_mppt = models.IntegerField()
    max_input_voltage_v = models.FloatField(default=0)
    max_input_current_a = models.FloatField(default=0)
    efficiency_pct = models.FloatField(default=0)
    serial_number = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.brand} {self.model}"


class DCProduction(models.Model):
    timestamp = models.DateTimeField()
    system = models.ForeignKey(
        PVSystem, on_delete=models.CASCADE, related_name='dc_production'
    )
    dc_power_kw = models.FloatField()
    dc_voltage_v = models.FloatField()
    dc_current_a = models.FloatField()
    irradiance_wm2 = models.FloatField()

    class Meta:
        unique_together = ('timestamp', 'system')
        indexes = [models.Index(fields=['system', 'timestamp'])]
        ordering = ['-timestamp']


class ACProduction(models.Model):
    timestamp = models.DateTimeField()
    system = models.ForeignKey(
        PVSystem, on_delete=models.CASCADE, related_name='ac_production'
    )
    ac_power_kw = models.FloatField()
    ac_energy_kwh = models.FloatField()
    ac_voltage_v = models.FloatField()
    ac_frequency_hz = models.FloatField(default=50)
    power_factor = models.FloatField()

    class Meta:
        unique_together = ('timestamp', 'system')
        indexes = [models.Index(fields=['system', 'timestamp'])]
        ordering = ['-timestamp']