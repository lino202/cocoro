from django.shortcuts import redirect, render
from django.conf import settings
from .forms import UploadMeshForm
import os 
import pickle
from .utils import parseMesh, parseElectrodes


# Main view.
# Here we upload the mesh and parse its information and save in database
def tissue(request):
    # Retrieve data from the database
    files = os.listdir(settings.MEDIA_ROOT)
    mesh_files = []
    electrodes_files = []
    for file in files:
        if '.pickle' in file and not 'electrodes' in file:
            mesh_files.append(file.split('.')[0])
        if '.pickle' in file and 'electrodes' in file:
            electrodes_files.append(file.split('.')[0])
    
    return render(request, 'cocoroMain/tissue.html', {'mesh_files': mesh_files, 'electrodes_files': electrodes_files})

# Cellular view.
# Here we can run cellular simulations and plots
def cellular(request):
    return render(request, 'cocoroMain/cellular.html')


# Here we upload the mesh and parse its information and save in database
def upload(request):
    if request.method == 'POST':
        
        form = UploadMeshForm(request.POST, request.FILES)
        
        if form.is_valid():
            
            uploadedFile = request.FILES['file']

            # PARSE
            # Has the user loaded electrodes or a mesh?
            if 'electrodes' in uploadedFile.name:
                parsed = parseElectrodes(uploadedFile.read())
            else:
                parsed = parseMesh(uploadedFile.read())
                
            # SAVE
            # name = createUniqueName(uploadedFile.name) 
            name = uploadedFile.name.split('.')[0]
            path = os.path.join(settings.MEDIA_ROOT, "{}.pickle".format(name))
            with open(path, 'wb') as f:
                pickle.dump(parsed, f)

            # return redirect('/tissue')

    else:
        form = UploadMeshForm()


    return render(request, 'cocoroMain/upload.html', {'form': form})