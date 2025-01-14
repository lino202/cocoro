from django.shortcuts import redirect, render
from django.conf import settings
from .forms import UploadMeshForm
import os 
import pickle
from .utils import parseMesh


# Main view.
# Here we upload the mesh and parse its information and save in database
def tissue(request):
    # Retrieve data from the database
    files = os.listdir(settings.MEDIA_ROOT)
    files = [file.split('.')[0] for file in files if ".pickle" in file]
    return render(request, 'carSimMain/tissue.html', {'files': files})

# Cellular view.
# Here we can run cellular simulations and plots
def cellular(request):
    return render(request, 'carSimMain/cellular.html')


# Here we upload the mesh and parse its information and save in database
def upload(request):
    if request.method == 'POST':
        
        form = UploadMeshForm(request.POST, request.FILES)
        
        if form.is_valid():
            # PARSE
            uploadedFile = request.FILES['file']
            vertexs, actual_points, actual_elems, render_elems, normals, elementType, stim_params, connections, fibers_long, render_points_global_ids, dx = parseMesh(uploadedFile.read())

            mesh_parsed = {'vertexs': vertexs, 'actual_points': actual_points, 'actual_elems': actual_elems, 'render_elems': render_elems, 'normals': normals, 'elementType': elementType, 
                           'stim_params': stim_params, 'connections': connections, 'fibers_long': fibers_long, 'dx': dx,
                           'render_points_global_ids': render_points_global_ids}

            # SAVE
            # name = createUniqueName(uploadedFile.name) 
            name = uploadedFile.name.split('.')[0]
            path = os.path.join(settings.MEDIA_ROOT, "{}.pickle".format(name))
            with open(path, 'wb') as f:
                pickle.dump(mesh_parsed, f)

            return redirect('/tissue')

    else:
        form = UploadMeshForm()


    return render(request, 'carSimMain/upload.html', {'form': form})