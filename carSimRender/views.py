from django.shortcuts import render
from django.conf import settings
from django.shortcuts import render
from django.core.files.storage import FileSystemStorage
from .forms import UploadFileForm
import meshio
import os 
import numpy as np
import datetime
import copy

def getDataFromMesh(meshPath):
    mesh = meshio.read(meshPath)
    
    #Get vertexs form -1 to 1
    vertexs = copy.deepcopy(mesh.points)
    vertexs = (vertexs - np.min(mesh.points, axis=0))
    norm = np.max(mesh.points, axis=0) - np.min(mesh.points, axis=0)
    vertexs = np.divide(vertexs, norm, where=norm!=0)
    vertexs = (vertexs * 2) - 1
    vertexs = vertexs.flatten().tolist()
    
    #Get cells, obj files cannot have line elems so 1D should be pass as .vtk
    if "triangle" in mesh.cells_dict.keys():
        cells = mesh.cells_dict['triangle'].flatten().tolist()
        meshType = "triangle" 
    elif "polygon" in mesh.cells_dict.keys():
        cells = mesh.cells_dict['polygon'].flatten().tolist()
        meshType = "line"
    elif "line" in mesh.cells_dict.keys():
        cells = mesh.cells_dict['line'].flatten().tolist()
        meshType = "line"
    else: 
        raise ValueError("Only triangles or lines are accepted")
    
    #Get normals 
    for key in mesh.point_data.keys():
        if 'vn' in key:
            normals = mesh.point_data[key].flatten().tolist()
            break

    #Get init Values for Voi
    voiInitValues = np.zeros(mesh.points.shape[0])
    voiInitValues = voiInitValues.flatten().tolist()
    
    #Get stim params from .vtk point data
    stimParams = np.zeros((mesh.points.shape[0],4))
    if not "stim_nodes" in mesh.point_data.keys(): raise ValueError("No stim_nodes point data is present in vtk file") 
    stimParams[:,0] = mesh.point_data["stim_nodes"]    #stim_period
    stimParams[:,1] = 0 #mesh.point_data["stim_nodes"]    #stim_cyclelength
    if not "stim_nodes_mag" in mesh.point_data.keys(): raise ValueError("No stim_nodes_mag point data is present in vtk file") 
    stimParams[:,2] = mesh.point_data["stim_nodes_mag"]  #stim_mag
    if not "stim_nodes_dur" in mesh.point_data.keys(): raise ValueError("No stim_nodes_dur point data is present in vtk file")
    stimParams[:,3] = mesh.point_data["stim_nodes_dur"] * 0.5    #stim_dur
    stimParams = stimParams.flatten().tolist()

    return vertexs, cells, normals, meshType, voiInitValues, stimParams
    
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
            vertexs, cells, normals, meshType, voiInitValues, stimParams = getDataFromMesh(os.path.join(settings.MEDIA_ROOT, uniqueName))
            data = {'vertexs':vertexs, 'cells':cells, 'normals':normals, 'meshType': meshType, 'voiInitValues': voiInitValues, 'stimParams': stimParams}
            context ['data'] = data

    else:
        form = UploadFileForm()
        context ['form'] = form


    return render(request, 'index.html', context)
