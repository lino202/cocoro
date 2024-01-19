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
from tqdm import tqdm

def get2DMeshConnections(points):
    thres = np.unique(np.abs(np.diff(points,axis=0)))[1]
    thres = thres * 2 -  thres * 0.5
    print("Threshold used for the search in getregQuadFDrelations {}".format(thres))

    #Now we can get the node connections, ordeing like this nPointsx8 [index,:] = [i,j+1 ; i+1,j+1 ; i+1,j ; i+1,j-1 ; i,j-1 ; i-1,j-1 ; i-1,j ; i-1,j+1]
    tree = KDTree(points)    
    idx_neighbours = tree.query_ball_point(points, thres)
 
    nodeConnections = np.ones((points.shape[0],8), dtype=int) * points.shape[0] #if I use nan or -1 we'll have to switch to float or i32 -> more memory, like this we use u32
    for idx, point_idx in tqdm(enumerate(idx_neighbours)):
        point_idx.remove(idx)
        currentDiff = points[point_idx] - points[idx]
        for sub_idx in range(currentDiff.shape[0]):
            if (currentDiff[sub_idx,0] == 0. and currentDiff[sub_idx,1] > 0.):
                nodeConnections[idx,0] = point_idx[sub_idx] 
            elif (currentDiff[sub_idx,0] > 0. and currentDiff[sub_idx,1] > 0.):
                nodeConnections[idx,1] = point_idx[sub_idx]
            elif (currentDiff[sub_idx,0] > 0. and currentDiff[sub_idx,1] == 0.):
                nodeConnections[idx,2] = point_idx[sub_idx]
            elif (currentDiff[sub_idx,0] > 0. and currentDiff[sub_idx,1] < 0.):
                nodeConnections[idx,3] = point_idx[sub_idx] 
            elif (currentDiff[sub_idx,0] == 0. and currentDiff[sub_idx,1] < 0.):
                nodeConnections[idx,4] = point_idx[sub_idx]
            elif (currentDiff[sub_idx,0] < 0. and currentDiff[sub_idx,1] < 0.):
                nodeConnections[idx,5] = point_idx[sub_idx]
            elif (currentDiff[sub_idx,0] < 0. and currentDiff[sub_idx,1] == 0.):
                nodeConnections[idx,6] = point_idx[sub_idx]
            elif (currentDiff[sub_idx,0] < 0. and currentDiff[sub_idx,1] > 0.):
                nodeConnections[idx,7] = point_idx[sub_idx]
            else:
                raise ValueError("Wrong assigment, please check")
    
    return nodeConnections


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
    if 'vn' in mesh.point_data.keys():
        normals = mesh.point_data['vn']
    elif 'obj:vn' in  mesh.point_data.keys():
        normals = mesh.point_data['obj:vn']
    else:
        normals = np.zeros((mesh.points.shape[0],3))

    if np.max(normals) > 0:
        # ALWAYS normalize!
        normals_norms = np.linalg.norm(normals, axis=1)
        normals = normals /  np.array([normals_norms, normals_norms, normals_norms]).T



    #Get init Values for Voi
    if 'voi_init' in mesh.point_data.keys():
        voiInitValues = mesh.point_data['voi_init']
    else:
        voiInitValues = np.zeros(mesh.points.shape[0])
    
    #Get stim params from .vtk point data 
    stim_params = np.zeros((mesh.points.shape[0], 4)) 
    if "stim_nodes" in mesh.point_data.keys():
        stim_params[:,0] = mesh.point_data["stim_nodes"]    #stim_period
    if "stim_nodes_mag" in mesh.point_data.keys():
        stim_params[:,1] = mesh.point_data["stim_nodes_mag"]  #stim_mag
    if "stim_nodes_dur" in mesh.point_data.keys():
        stim_params[:,2] = mesh.point_data["stim_nodes_dur"]    #stim_dur
    if "stim_nodes_start" in mesh.point_data.keys():
        stim_params[:,3] = mesh.point_data["stim_nodes_start"]    #stim_start
    
    # Get relations/connections for finite differences computation
    if "triangle" in mesh.cells_dict.keys():
        connections = get2DMeshConnections(mesh.points)  # Get finite difference relations for simulating
    else: 
        connections = np.array([0,0,0,0])

    # Get fiber direction 
    if "fibers_long" in mesh.point_data.keys():
        fibers_long = mesh.point_data['fibers_long'] 
        # ALWAYS normalize!
        fibers_norms = np.linalg.norm(fibers_long, axis=1)
        fibers_long = fibers_long /  np.array([fibers_norms, fibers_norms, fibers_norms]).T
    else:
        fibers_long = np.zeros((mesh.points.shape[0],3))
        fibers_long[:,0] = 1.


    #Get all as one dimensional list for passing to json and js
    vertexs        = vertexs.flatten().tolist()
    cells          = cells.flatten().tolist()
    normals        = normals.flatten().tolist()
    voiInitValues  = voiInitValues.flatten().tolist()
    stim_params    = stim_params.flatten().tolist()
    connections    = connections.flatten().tolist()
    fibers_long    = fibers_long.flatten().tolist()

    return vertexs, cells, normals, meshType, voiInitValues, stim_params, connections, fibers_long
    
def createUniqueName(name):
    today = datetime.datetime.now()
    date_time = today.strftime("%d-%m-%Y__%H-%M-%S")
    uniqueName = name.split('.')[0] + '_' + date_time + '.' + name.split('.')[1]
    return uniqueName

# Main view.
# Here we upload the mesh and parse its information
def tissue(request):
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
            vertexs, cells, normals, meshType, voiInitValues, stim_params, connections, fibers_long = getDataFromMesh(os.path.join(settings.MEDIA_ROOT, uniqueName))
            data = {'vertexs':vertexs, 'cells':cells, 'normals':normals, 'meshType': meshType, 
                    'voiInitValues': voiInitValues, 'stim_params': stim_params, 
                    'connections': connections, 'fibers_long' : fibers_long}
            context ['data'] = data
    else:
        form = UploadFileForm()
        context ['form'] = form


    return render(request, 'carSimMain/tissue.html', context)

# Cellular view.
# Here we can run cellular simulations and plots
def cellular(request):
    # context = {}
    return render(request, 'carSimMain/cellular.html')


def meshRender(request):
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


    return render(request, 'carSimMain/render.html', context)


def heat(request):
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


    return render(request, 'carSimMain/heat.html', context)