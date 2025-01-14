from django import forms

class UploadMeshForm(forms.Form):
    file = forms.FileField()