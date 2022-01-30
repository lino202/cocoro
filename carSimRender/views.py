from django.shortcuts import render
from django.conf import settings
from django.shortcuts import render
from django.core.files.storage import FileSystemStorage
from .forms import UploadFileForm
import meshio
import os 
import numpy as np
import datetime

def getDataFromMesh(meshPath):
    mesh = meshio.read(meshPath)
    vertexs = mesh.points
    for i in range(3):
        vertexs[:,i] = (vertexs[:,i] - np.amin(vertexs[:,i])) / (np.amax(vertexs[:,i]) - np.min(vertexs[:,i]))
    vertexs = (vertexs * 2) - 1

    vertexs = vertexs.flatten().tolist()
    cells = mesh.cells_dict['triangle'].flatten().tolist()
    normals = mesh.point_data['obj:vn'].flatten().tolist()
    return vertexs, cells, normals

def createUniqueName(name):
    today = datetime.datetime.now()
    date_time = today.strftime("%d-%m-%Y__%H-%M-%S")
    uniqueName = name.split('.')[0] + '_' + date_time + '.' + name.split('.')[1]
    return uniqueName


# Create your views here.
def index(request):
    context = {}
    if request.method == 'POST':
        form = UploadFileForm(request.POST, request.FILES)
        context ['form'] = form
        if form.is_valid():
            uploadedFile = request.FILES['file']
            fs = FileSystemStorage()
            uniqueName = createUniqueName(uploadedFile.name)
            fs.save(uniqueName, uploadedFile)
            context['url'] = fs.url(uniqueName)
            vertexs, cells, normals = getDataFromMesh(os.path.join(settings.MEDIA_ROOT, uniqueName))
            data = {'vertexs':vertexs, 'cells':cells, 'normals':normals}
            context ['data'] = data

    else:
        form = UploadFileForm()
        context ['form'] = form


    return render(request, 'index.html', context)
