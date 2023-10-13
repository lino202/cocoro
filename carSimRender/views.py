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
from scipy.spatial import KDTree

# TODO This might not been done here as it could be to slow
def getregQuadFDrelations(points):
    thres = np.unique(np.abs(np.diff(points,axis=0)))[1]
    thres = thres + np.abs(np.sqrt(2*thres**2) - thres)/2
    print("Threshold used for the search in getregQuadFDrelations {}".format(thres))
    tree = KDTree(points)
    res = tree.query_ball_point(points, thres - 1e-6)
    resArr = np.zeros((res.shape[0],4))
    for i in range(len(res)):
        res[i].remove(i)
        if len(res[i]) > 4: raise ValueError("Wrong threshold, more than 4 neighs where found, point {}".format(i))
        if len(res[i])!=4:
            resArr[i] = [-1, -1, -1, -1]
        else:
            resArr[i] = res[i]
    return resArr
    # rbmVersors = rbmVersors[idxs,:]
    # angles = angles[idxs]


def getDataFromMesh(meshPath):
    mesh = meshio.read(meshPath)
    
    #Get vertexs form -1 to 1
    vertexs = copy.deepcopy(mesh.points)
    vertexs = (vertexs - np.min(mesh.points, axis=0))
    norm = np.max(mesh.points, axis=0) - np.min(mesh.points, axis=0)
    vertexs = np.divide(vertexs, norm, where=norm!=0)
    vertexs = (vertexs * 2) - 1
    
    #Get cells, obj files cannot have line elems so 1D should be pass as .vtk
    if "triangle" in mesh.cells_dict.keys():   
        cells = mesh.cells_dict['triangle']
        meshType = "triangle" 
    elif "polygon" in mesh.cells_dict.keys():
        cells = mesh.cells_dict['polygon']
        meshType = "line"
    elif "line" in mesh.cells_dict.keys():
        cells = mesh.cells_dict['line']
        meshType = "line"
    else: 
        raise ValueError("Only triangles or lines are accepted")
    
    #Get normals
    normals = np.zeros((mesh.points.shape[0],3))
    for key in mesh.point_data.keys():
        if 'vn' in key:
            normals = mesh.point_data[key]
            break

    #Get init Values for Voi
    voiInitValues = np.zeros(mesh.points.shape[0])
    
    #Get stim params from .vtk point data 
    params = np.zeros((mesh.points.shape[0], 4)) 
    if "stim_nodes" in mesh.point_data.keys():
        params[:,0] = mesh.point_data["stim_nodes"]    #stim_period
    if "stim_nodes_mag" in mesh.point_data.keys():
        params[:,1] = mesh.point_data["stim_nodes_mag"]  #stim_mag
    if "stim_nodes_dur" in mesh.point_data.keys():
        params[:,2] = mesh.point_data["stim_nodes_dur"]    #stim_dur
    
    if "triangle" in mesh.cells_dict.keys():
        regQuadFDrelations = getregQuadFDrelations(vertexs)  # Get finite difference relations for simulating
        params = np.concatenate((params, regQuadFDrelations), axis=1)


    #Get all as one dimensional list for passing to json and js
    vertexs        = vertexs.flatten().tolist()
    cells          = cells.flatten().tolist()
    normals        = normals.flatten().tolist()
    voiInitValues  = voiInitValues.flatten().tolist()
    params         = params.flatten().tolist()

    return vertexs, cells, normals, meshType, voiInitValues, params
    
def createUniqueName(name):
    today = datetime.datetime.now()
    date_time = today.strftime("%d-%m-%Y__%H-%M-%S")
    uniqueName = name.split('.')[0] + '_' + date_time + '.' + name.split('.')[1]
    return uniqueName

# Main view.
# Here we upload the mesh and parese its information
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
            vertexs, cells, normals, meshType, voiInitValues, params = getDataFromMesh(os.path.join(settings.MEDIA_ROOT, uniqueName))
            data = {'vertexs':vertexs, 'cells':cells, 'normals':normals, 'meshType': meshType, 'voiInitValues': voiInitValues, 'params': params}
            context ['data'] = data
    else:
        form = UploadFileForm()
        context ['form'] = form


    return render(request, 'index.html', context)
