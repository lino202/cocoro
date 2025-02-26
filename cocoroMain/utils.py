from django.conf import settings
import os 
import numpy as np
import datetime
from scipy.spatial import KDTree
from tqdm import tqdm
import vtk
from vtk.util import numpy_support # type: ignore

def saveVtkPolyMesh(mesh, fileName):
    writer = vtk.vtkXMLPolyDataWriter()
    writer.SetFileName(os.path.join(settings.MEDIA_ROOT, "{}.vtp".format(fileName)))
    writer.SetInputData(mesh)
    writer.Write()

def normalizeNxDArray(array):
    norms = np.linalg.norm(array, axis=1)
    return array /  np.array([norms, norms, norms]).T

def createUniqueName(name):
    today = datetime.datetime.now()
    date_time = today.strftime("%d-%m-%Y__%H-%M-%S")
    uniqueName = name.split('.')[0] + '_' + date_time + '.' + name.split('.')[1]
    return uniqueName

def get2DMeshConnections(points, dx):
    # This uses KDtree which is fast but if the mesh has a hole of 1 (quad) element the result is wrong! it will be better to use a method as in 3D
    # connections and speed it up TODO
    thres = 1.5 * dx # Higher than 1.41 and lower than 2 times dx
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


def get3DMeshConnections(mesh, dx):
    # Now we can get the node connections, ordeing like this 
    # nPointsx26 [index,:] = [i,j+1,k;  i+1,j+1,k ; i+1,j,k     ; i+1,j-1,k ; i,j-1,k   ; i-1,j-1,k ; i-1,j,k   ; i-1,j+1,k;
    #                         i,j,k+1;  i,j+1,k+1 ; i+1,j+1,k+1 ; i+1,j,k+1   ; i+1,j-1,k+1 ; i,j-1,k+1   ; i-1,j-1,k+1 ; i-1,j,k+1  ; i-1,j+1,k+1;
    #                         i,j,k-1;  i,j+1,k-1 ; i+1,j+1,k-1 ; i+1,j,k-1   ; i+1,j-1,k-1 ; i,j-1,k-1   ; i-1,j-1,k-1 ; i-1,j,k-1  ; i-1,j+1,k-1;]
    nPoints = mesh.GetNumberOfPoints()
    points  = numpy_support.vtk_to_numpy(mesh.GetPoints().GetData())
    half_dx = dx/2
    
    points = np.round(points).astype(int) # there should not be decimals, so pass all to int to erase round errors
    nodeConnections = np.ones((nPoints, 26), dtype=int) * nPoints #if I use nan or -1 we'll have to switch to float or i32 -> more memory, like this we use u32
    cellsIds = vtk.vtkIdList()
    pointIds = vtk.vtkIdList()
    for idx in tqdm(range(points.shape[0])):
        mesh.GetPointCells(idx, cellsIds)
        for j in range(cellsIds.GetNumberOfIds()):
            cellId = cellsIds.GetId(j)
            mesh.GetCellPoints(cellId, pointIds)

            for k in range(pointIds.GetNumberOfIds()):
                pointId = pointIds.GetId(k)
                if ((pointId!=idx) and (not pointId in nodeConnections[idx,:])):
                    # pointId is wrong
                    currentDiff = points[pointId] - points[idx]
                    
                    if (currentDiff[0] > half_dx):
                        # Front plane if x axis get out the screen, plane yz centered in node i+1
                        if (currentDiff[1] > half_dx):
                            #  Line z passing on j+1 and i+1
                            if (currentDiff[2] > half_dx):
                                # i+1,j+1,k+1
                                nodeConnections[idx,10] = pointId
                            elif (currentDiff[2] < -half_dx):
                                # i+1,j+1,k-1
                                nodeConnections[idx,19] = pointId
                            else:
                                # i+1,j+1,k
                                nodeConnections[idx,1] = pointId
                        elif (currentDiff[1] < -half_dx):
                            #  Line z passing on j-1 and i+1
                            if (currentDiff[2] > half_dx):
                                # i+1,j-1,k+1
                                nodeConnections[idx,11] = pointId
                            elif (currentDiff[2] < -half_dx):
                                # i+1,j-1,k-1
                                nodeConnections[idx,21] = pointId
                            else:
                                # i+1,j-1,k
                                nodeConnections[idx,3] = pointId
                        else:
                            # Line z
                            if (currentDiff[2] > half_dx):
                                # i+1,j,k+1
                                nodeConnections[idx,11] = pointId
                            elif (currentDiff[2] < -half_dx):
                                # i+1,j,k-1
                                nodeConnections[idx,20] = pointId
                            else:
                                # i+1,j,k
                                nodeConnections[idx,2] = pointId


                    elif (currentDiff[0] < -half_dx):
                        # Back plane if x axis get out the screen, plane yz centered in node i-1
                        if (currentDiff[1] > half_dx):
                            #  Line z passing on j+1 and i-1
                            if (currentDiff[2] > half_dx):
                                # i-1,j+1,k+1
                                nodeConnections[idx,16] = pointId
                            elif (currentDiff[2] < -half_dx):
                                # i-1,j+1,k-1
                                nodeConnections[idx,25] = pointId
                            else:
                                # i-1,j+1,k
                                nodeConnections[idx,7] = pointId
                        elif (currentDiff[1] < -half_dx):
                            #  Line z passing on j-1 and i-1
                            if (currentDiff[2] > half_dx):
                                # i-1,j-1,k+1
                                nodeConnections[idx,14] = pointId
                            elif (currentDiff[2] < -half_dx):
                                # i-1,j-1,k-1
                                nodeConnections[idx,23] = pointId
                            else:
                                # i-1,j-1,k
                                nodeConnections[idx,5] = pointId
                        else:
                            # Line z passing on i-1 and j
                            if (currentDiff[2] > half_dx):
                                # i-1,j,k+1
                                nodeConnections[idx,15] = pointId
                            elif (currentDiff[2] < -half_dx):
                                # i-1,j,k-1
                                nodeConnections[idx,24] = pointId
                            else:
                                # i-1,j,k
                                nodeConnections[idx,6] = pointId

                    else:
                        # Middle plane if x axis get out the screen, plane yz centered in central node
                        if (currentDiff[1] > half_dx):
                            #  Line z passing on j+1
                            if (currentDiff[2] > half_dx):
                                # i,j+1,k+1
                                nodeConnections[idx,9] = pointId
                            elif (currentDiff[2] < -half_dx):
                                # i,j+1,k-1
                                nodeConnections[idx,18] = pointId
                            else:
                                # i,j+1,k
                                nodeConnections[idx,0] = pointId
                        elif (currentDiff[1] < -half_dx):
                            #  Line z passing on j-1
                            if (currentDiff[2] > half_dx):
                                # i,j-1,k+1
                                nodeConnections[idx,13] = pointId
                            elif (currentDiff[2] < -half_dx):
                                # i,j-1,k-1
                                nodeConnections[idx,22] = pointId
                            else:
                                # i,j-1,k
                                nodeConnections[idx,4] = pointId
                        else:
                            # Line z
                            if (currentDiff[2] > half_dx):
                                # i,j,k+1
                                nodeConnections[idx,8] = pointId
                            else:
                                # i,j,k-1
                                nodeConnections[idx,17] = pointId

    return nodeConnections


def parseMesh(binaryData):
    # Read mesh from binary data, we use vtk to facilitate the processing
    assert b'BINARY' in binaryData, "Only binary data is allowed and maybe you are not using .vtk!"
    reader = vtk.vtkDataSetReader()
    reader.SetReadFromInputString(True)
    reader.SetBinaryInputString(binaryData, len(binaryData))
    reader.Update()
    mesh = reader.GetOutput()
    assert mesh.GetMaxCellSize()==2 or mesh.GetMaxCellSize()==4 or mesh.GetMaxCellSize()==8, "Only line and linear quad and hexahedron elem type allowed!"

    # For now we only accept cubical complexes (line, quad or hexahedron). So the data we need to parse 
    # from the mesh is correspondent to this decision:
    # -vertexs: the mesh points for rendering (surface) normalized to values in -1 to 1
    # -render_elems: we need triangles forming the superficial mesh with the vertexs for rendering, we parse this from mesh cells
    # -normals: the normals in the vertexs
    # -elementType: the type of element line, quad or hexahedron
    # -stim_params: stimulation period, dur, start and amp for every node
    # -connections: the array encoding the connection of every node with its neighbours,...
    # -fibers_long: the node-wise longitudinal fiber direction for defining the conductivity.
    # -render_points_global_ids: the node idxs that correspond to vertexs, to match the compute value to the correct rendering vertex
    # -dx: the spacing between nodes in the mesh

    # The mesh usually comes form meshio as UnstructuredGrid and we only accept line, quad or hexa
    if (mesh.GetMaxCellSize()==8 or mesh.GetMaxCellSize()==4):
        if (mesh.GetMaxCellSize()==8):
            # Get ids for tracking the original points 
            idFilter = vtk.vtkIdFilter()
            idFilter.SetInputData(mesh)
            idFilter.SetPointIdsArrayName("ids")
            idFilter.SetPointIds(True)
            idFilter.SetCellIds(False)
            idFilter.Update()
            mesh = idFilter.GetOutput()

            # Get the surface mesh
            surface_filter = vtk.vtkDataSetSurfaceFilter()
            surface_filter.SetInputData(mesh)
            surface_filter.Update()
            renderMesh = surface_filter.GetOutput()
            # saveVtkPolyMesh(hexaSurfMesh, "hexaSurfMesh")
        else: #quad
            geometry_filter = vtk.vtkGeometryFilter()
            geometry_filter.SetInputData(mesh)
            geometry_filter.Update()
            renderMesh = geometry_filter.GetOutput()
        
        quad_to_tri_filter = vtk.vtkTriangleFilter()
        quad_to_tri_filter.SetInputData(renderMesh)
        quad_to_tri_filter.Update()
        renderMesh = quad_to_tri_filter.GetOutput()
        saveVtkPolyMesh(renderMesh, "renderMesh")
    else:
        renderMesh = mesh
        
    # Get vertexs and dx
    vertexs = numpy_support.vtk_to_numpy(renderMesh.GetPoints().GetData())

    # For getting dx we pass all to int as we are in um and the minimum difference dx should be
    # not less than 50 um (cell size), in this way we avoid precision error of floats
    # Vertexs should be in um !!
    dx = np.max(np.abs(np.round(vertexs[0,:]).astype(int) - np.round(vertexs[1,:]).astype(int)))

    # Normalize vertexs to -1 to 1
    norm_dx = ((dx - vertexs.min()) / (vertexs.max() - vertexs.min())) * 2   # no need to substract 1
    vertexs = (vertexs - vertexs.min()) / (vertexs.max() - vertexs.min())
    vertexs = (vertexs * 2) - 1

    # We need all the points for saving the mesh with actual ranges (not [-1,1]) and for hexa we need the 
    # inner points (vertexs are the points/nodes for the render mesh)
    actual_points = numpy_support.vtk_to_numpy(mesh.GetPoints().GetData())
        
    # Get the actual elems for the case where we need to save the mesh with ensight format
    if mesh.GetMaxCellSize()==2:
        actual_elems = numpy_support.vtk_to_numpy(mesh.GetCells().GetData())
        actual_elems = actual_elems.reshape(-1,2+1)
    elif mesh.GetMaxCellSize()==4:
        actual_elems = numpy_support.vtk_to_numpy(mesh.GetCells().GetData())
        actual_elems = actual_elems.reshape(-1,4+1)
    elif mesh.GetMaxCellSize()==8:
        actual_elems = numpy_support.vtk_to_numpy(mesh.GetCells().GetData())
        actual_elems = actual_elems.reshape(-1,8+1)
    else:
        raise ValueError("Only line, quad and hexa are allowed")
    actual_elems = actual_elems[:,1:]
    
    #Get render elems (triangles or lines)
    if mesh.GetMaxCellSize()==2:
        render_elems = numpy_support.vtk_to_numpy(renderMesh.GetCells().GetData())
        render_elems = render_elems.reshape(-1,2+1)
        if np.any(render_elems[:,0]!=2): raise ValueError("At least one wrong elem type")
    else: #triangles from quad or hexa meshes
        render_elems = numpy_support.vtk_to_numpy(renderMesh.GetPolys().GetData())
        render_elems = render_elems.reshape(-1,3+1)
        if np.any(render_elems[:,0]!=3): raise ValueError("At least one wrong elem type")
    render_elems = render_elems[:,1:]

    # Get elemType and global_ids (important for hexa)
    if mesh.GetMaxCellSize()==2: 
        elementType = 'line'
        render_points_global_ids = np.array([-1,-1])
    elif mesh.GetMaxCellSize()==4: 
        elementType = 'quad'
        render_points_global_ids = np.array([-1,-1])
    elif mesh.GetMaxCellSize()==8: 
        elementType = 'hexa'
        tmp_render_points_global_ids = numpy_support.vtk_to_numpy(renderMesh.GetPointData().GetArray("ids"))
        render_points_global_ids = np.ones(mesh.GetNumberOfPoints()).astype(int) * mesh.GetNumberOfPoints()
        render_points_global_ids[tmp_render_points_global_ids] = np.arange(tmp_render_points_global_ids.shape[0])

    #Compute normals
    if mesh.GetMaxCellSize()==2:
        # Suppose a normal
        normals = np.zeros(vertexs.shape)
        normals[:,1] = 1

        # Get nodes directions from elems directions
        vecs = np.zeros(vertexs.shape)
        elems_dir = np.diff(vertexs, axis=0)
        for i in range(vertexs.shape[0]):
            vecs[i,:] = np.mean(elems_dir[np.where(render_elems==i)[0],:],axis=0)
        vecs = normalizeNxDArray(vecs)

        # Check if normals are parallel and rise a warning
        dotProduct = np.abs(np.sum(vecs * normals, axis=1))
        if np.where((dotProduct > 1-1e-5) & (dotProduct < 1+1e-5))[0].size>0:
            raise Warning("Normal in line is almost parallel to element, which might lead to poor lighting!")
    else:
        normals_filter = vtk.vtkPolyDataNormals()
        normals_filter.SetInputData(renderMesh)
        normals_filter.SplittingOff()
        normals_filter.ConsistencyOn()
        normals_filter.AutoOrientNormalsOn()
        normals_filter.ComputePointNormalsOn()
        normals_filter.ComputeCellNormalsOff()
        normals_filter.Update()
        renderMesh = normals_filter.GetOutput()
        normals  = numpy_support.vtk_to_numpy(renderMesh.GetPointData().GetArray("Normals"))
        # saveVtkPolyMesh(renderMesh, "surfmeshnormals")
    normals = normalizeNxDArray(normals)
    
    #Get stim params from .vtk point data 
    stim_params = np.zeros((mesh.GetNumberOfPoints(), 4)) 
    if mesh.GetPointData().GetAbstractArray("stim_period"):
        stim_params[:,0] = numpy_support.vtk_to_numpy(mesh.GetPointData().GetAbstractArray("stim_period"))    #stim_period
    if mesh.GetPointData().GetAbstractArray("stim_mag"):
        stim_params[:,1] = numpy_support.vtk_to_numpy(mesh.GetPointData().GetAbstractArray("stim_mag"))  #stim_mag
    if mesh.GetPointData().GetAbstractArray("stim_dur"):
        stim_params[:,2] = numpy_support.vtk_to_numpy(mesh.GetPointData().GetAbstractArray("stim_dur"))    #stim_dur
    if mesh.GetPointData().GetAbstractArray("stim_start"):
        stim_params[:,3] = numpy_support.vtk_to_numpy(mesh.GetPointData().GetAbstractArray("stim_start"))    #stim_start
    
    # Get relations/connections for finite differences computation
    if mesh.GetMaxCellSize()==2: 
        connections = np.array([-1,-1]) # not useful as long as nodes numbering is 0->1, 1->2, 2->3 ,.. and so on for lines
    elif mesh.GetMaxCellSize()==4: 
        connections = get2DMeshConnections(numpy_support.vtk_to_numpy(mesh.GetPoints().GetData()), dx)
    elif mesh.GetMaxCellSize()==8:
        connections = get3DMeshConnections(mesh, dx)

    # Get fiber direction, only important for quad and hexa as in line we use the total sigma_long 
    if mesh.GetPointData().GetAbstractArray("fibers_long"):
        fibers_long = numpy_support.vtk_to_numpy(mesh.GetPointData().GetAbstractArray("fibers_long"))
        fibers_long = normalizeNxDArray(fibers_long)
    else:
        fibers_long = np.zeros((mesh.GetNumberOfPoints(),3))
        fibers_long[:,0] = 1

    # For the line we add a dx thick parallelepiped because if we have the mouse stim is impossible to get 
    # the stim to be inside the bounding box
    if (elementType == 'line'):
        vertexs_min_bb = np.min(vertexs, axis=0)
        vertexs_max_bb = np.max(vertexs, axis=0)

        # It does not matter if we go out the clip space as this bounding box is used for mouse click determination
        vertexs_min_bb -= norm_dx
        vertexs_max_bb += norm_dx
    else:
        vertexs_min_bb = np.min(vertexs, axis=0)
        vertexs_max_bb = np.max(vertexs, axis=0)

    #Get all as one dimensional list for passing to json and js
    # TODO we are importing/saving so much data, this can block the page if the mesh is too big
    # the data saved can be reduced and connections can be computed in the gpu I assume pretty fast
    vertexs        = vertexs.flatten().tolist()
    actual_points  = actual_points.flatten().tolist()
    actual_elems   = actual_elems.flatten().tolist()
    render_elems   = render_elems.flatten().tolist()
    normals        = normals.flatten().tolist()
    stim_params    = stim_params.flatten().tolist()
    connections    = connections.flatten().tolist()
    fibers_long    = fibers_long.flatten().tolist()
    render_points_global_ids = render_points_global_ids.flatten().tolist()
    vertexs_min_bb = vertexs_min_bb.tolist()
    vertexs_max_bb = vertexs_max_bb.tolist()
    

    parsed = {'vertexs': vertexs, 'actual_points': actual_points, 'actual_elems': actual_elems, 'render_elems': render_elems, 'normals': normals, 'elementType': elementType, 
                           'stim_params': stim_params, 'connections': connections, 'fibers_long': fibers_long, 'dx': int(dx), #dx is a numpy.int -> problems with pickle parses so int
                           'render_points_global_ids': render_points_global_ids, 'vertexs_min_bb': vertexs_min_bb, 'vertexs_max_bb': vertexs_max_bb }

    return parsed


def parseElectrodes(binaryData):
    # Read mesh from binary data, we use vtk to facilitate the processing
    assert b'BINARY' in binaryData, "Only binary data is allowed and maybe you are not using .vtk!"
    reader = vtk.vtkDataSetReader()
    reader.SetReadFromInputString(True)
    reader.SetBinaryInputString(binaryData, len(binaryData))
    reader.Update()
    mesh = reader.GetOutput()

    # Get electrodes_positions
    actual_points = numpy_support.vtk_to_numpy(mesh.GetPoints().GetData())
    actual_points = actual_points.flatten().tolist()

    return {'actual_points': actual_points}

