from django.shortcuts import redirect, render
from django.core.files.storage import FileSystemStorage
from django.conf import settings
from .forms import UploadMeshForm
import meshio
import os 
import numpy as np
import datetime
import copy
from scipy.spatial import KDTree
from tqdm import tqdm
import pickle
# from .models import File

# USEFUL FUNCTIONS -----------------------------------------------------------------------------------------

# def read_buffer(f):
#     # The first line specifies the version
#     line = f.readline().decode().strip()
#     if not line.startswith("# vtk DataFile Version"):
#         raise meshio._exceptions.ReadError("Illegal VTK header")

#     version = line[23:]
#     if version == "5.1":
#         return meshio.vtk._vtk_51.read(f)

#     # this also works for older format versions
#     return meshio.vtk._vtk_42.read(f)

def createUniqueName(name):
    today = datetime.datetime.now()
    date_time = today.strftime("%d-%m-%Y__%H-%M-%S")
    uniqueName = name.split('.')[0] + '_' + date_time + '.' + name.split('.')[1]
    return uniqueName

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
        cells       = mesh.cells_dict['triangle']
        elementType = "triangle" 
    elif "line" in mesh.cells_dict.keys():
        cells = mesh.cells_dict['line']
        elementType = "line"
    else: 
        raise ValueError("Only triangles or lines are accepted for now...")
    
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
    stim_params    = stim_params.flatten().tolist()
    connections    = connections.flatten().tolist()
    fibers_long    = fibers_long.flatten().tolist()

    return vertexs, cells, normals, elementType, stim_params, connections, fibers_long


# ACTUAL VIEWS -----------------------------------------------------------------------------------------

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
    # context = {}
    if request.method == 'POST':
        
        form = UploadMeshForm(request.POST, request.FILES)
        
        if form.is_valid():

            uploadedFile = request.FILES['file']
            name = uploadedFile.name
            fs = FileSystemStorage()
            fs.save(name, uploadedFile)
            # Parse mesh and save on the database

            # TODO Here the read_buffer function of meshio does not work as np.fromfile seems to require a physically saved file and not just in memory
            # one option seemed to do data = f.read() on _read_points under _vtk_51.py in mehsio and get the points with np.frombuffer()
            # but this seems to take a lot of time so in processing for now I save the mesh read it in the server processed and delete it
            # mesh = read_buffer(uploadedFile)
            vertexs, render_elems, normals, elementType, stim_params, connections, fibers_long = getDataFromMesh(os.path.join(settings.MEDIA_ROOT, name))
            os.remove(os.path.join(settings.MEDIA_ROOT, name))

            mesh_parsed = {'vertexs': vertexs, 'render_elems': render_elems, 'normals': normals, 'elementType': elementType, 
                           'stim_params': stim_params, 'connections': connections, 'fibers_long': fibers_long}

            name = name.split('.')[0]
            path = os.path.join(settings.MEDIA_ROOT, "{}.pickle".format(name))
            with open(path, 'wb') as f:
                pickle.dump(mesh_parsed, f)

            return redirect('/tissue')

    else:
        form = UploadMeshForm()


    return render(request, 'carSimMain/upload.html', {'form': form})




# # Here we upload the mesh and parse its information and save in database
# def upload(request):
#     # context = {}
#     if request.method == 'POST':
        
#         form = UploadMeshForm(request.POST, request.FILES)
        
#         if form.is_valid():

#             uploadedFile = request.FILES['file']
#             name = uploadedFile.name
#             fs = FileSystemStorage()
#             fs.save(name, uploadedFile)

#             # Parse mesh and save on the database
#             # TODO this is too slow,
#             vertexs, render_elems, normals, elementType, stim_params, connections, fibers_long = getDataFromMesh(os.path.join(settings.MEDIA_ROOT, name))
#             os.remove(os.path.join(settings.MEDIA_ROOT, name))

#             # Save on database
#             print("Saving Mesh---------------------------------")
#             mesh = Mesh.objects.create(name=name.split('.')[0])
#             mesh.save()

#             # Save points to the mesh
#             # -xyz for rendering and computing
#             # -connections for FD
#             # -normals for lighting on renderization 
#             # -fibers longitudinal vector
#             # -stimulation mag, dur, start, period
#             print("Saving Points and Point Data---------------------------------")
#             for i in tqdm(range(len(vertexs))):
#                 point = Point.objects.create(mesh=mesh, x=vertexs[i*3], y=vertexs[i*3+1], z=vertexs[i*3+2])
#                 point.save()

#                 if elementType=='line':
#                     pointConnections = PointConnections1D.objects.create(point=point, iminus=connections[i*2], iplus=connections[i*2+1])
#                     pointConnections.save()
#                 elif elementType=='triangle':   # quads can be made triangles
#                     pointConnections = PointConnections2D.objects.create(point=point, i_jplus=connections[i*8], iplus_jplus=connections[i*8+1], 
#                                                                         iplus_j=connections[i*8+2], iplus_jminus=connections[i*8+3],
#                                                                         i_jminus=connections[i*8+4], iminus_jminus=connections[i*8+5], 
#                                                                         iminus_j=connections[i*8+6], iminus_jplus=connections[i*8+7])
#                     pointConnections.save()
#                 else:
#                     raise ValueError("Mesh type should be line or triangles for now...")
                
#                 pointNormal = PointVector.objects.create(point=point, x=normals[i*3], y=normals[i*3+1], z=normals[i*3+2])
#                 pointNormal.save()

#                 pointFiber = PointVector.objects.create(point=point, x=fibers_long[i*3], y=fibers_long[i*3+1], z=fibers_long[i*3+2])
#                 pointFiber.save()

#                 pointStim = PointStim.objects.create(point=point, period=stim_params[i*4], mag=stim_params[i*4+1], dur=stim_params[i*4+2], start=stim_params[i*4+3])
#                 pointStim.save()


#             # Save elements to the mesh for FEM computation 
#             # if elementType=='line':
#             #     for i blabla:
#             #         element = Element1D.objects.create(mesh=mesh)
#             #         element.save()
#             # elif elementType=='triangle': #quads can be made as triangles
#             #     for i blabla:
#             #         element = Element2D.objects.create(mesh=mesh)
#             #         element.save()
#             # elif elementType=='hexa':
#             #     for i blabla:
#             #         element = Element3D.objects.create(mesh=mesh)
#             #         element.save()
      

#             # Save triangle elems for renderization
#             print("Saving Render Elems ---------------------------------")
#             if elementType=='line':
#                 for i in tqdm(range(len(render_elems),2)):
#                     element = Element1D.objects.create(mesh=mesh, left=render_elems[i], right=render_elems[i+1])
#                     element.save()
#             elif elementType=='triangle':
#                 for i in tqdm(range(len(render_elems),3)):
#                     element = RenderElementTriangle.objects.create(mesh=mesh, x=render_elems[i], y=render_elems[i+1], z=render_elems[i+2])
#                     element.save()
#             else:
#                 raise ValueError("We only can render lines or triangles!")
            
#             return redirect('/tissue')


#     else:
#         form = UploadMeshForm()


#     return render(request, 'carSimMain/upload.html', {'form': form})