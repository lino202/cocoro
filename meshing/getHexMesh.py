import os  
import argparse
import numpy as np
import meshio
import nibabel as nib
from tqdm import tqdm
from scipy.spatial import KDTree
import copy
import pickle

def main():

    parser = argparse.ArgumentParser(description="Options")
    parser.add_argument('--voxelData',type=str, required=True, help='path to data')
    parser.add_argument('--outPath',  type=str, required=True)
    args = parser.parse_args()

    # We load the voxelized structure and work with unitarian coordinates ijk for simplicity
    voxelMesh = nib.load(args.voxelData)
    affine    = voxelMesh.affine
    # print(voxelMesh.header)
    data      = np.asarray(voxelMesh.dataobj)
    points    = np.where(data>0)
    points    = np.array([points[0], points[1], points[2]]).T

    tree = KDTree(points)    
    idx_neighbours = tree.query_ball_point(points, 1.8)
    
    complete_idx_neighs = []
    for point_idx in tqdm(range(idx_neighbours.shape[0])):
        # We use the voxels that are sourrounded as boundary voxels do not have neighbours for generating another element
        if len(idx_neighbours[point_idx])==27:              
            idx_neighbours[point_idx].remove(point_idx)
            complete_idx_neighs.append(point_idx)

    elems = np.zeros((len(complete_idx_neighs),8)).astype(int)
    for idx, point_idx in enumerate(tqdm(complete_idx_neighs)):
        current_neighbours = idx_neighbours[point_idx]

        ijk_neighbours = points[tuple(current_neighbours),:]
        i,j,k = points[point_idx]

        #cube
        point1 = point_idx
        point2 = current_neighbours[np.where((ijk_neighbours[:,0]==i)     & (ijk_neighbours[:,1]==(j+1)) & (ijk_neighbours[:,2]==k    ))[0][0]]
        point3 = current_neighbours[np.where((ijk_neighbours[:,0]==(i+1)) & (ijk_neighbours[:,1]==j+1)   & (ijk_neighbours[:,2]==k    ))[0][0]]
        point4 = current_neighbours[np.where((ijk_neighbours[:,0]==(i+1)) & (ijk_neighbours[:,1]==j)     & (ijk_neighbours[:,2]==k    ))[0][0]]
        point5 = current_neighbours[np.where((ijk_neighbours[:,0]==i)     & (ijk_neighbours[:,1]==j)     & (ijk_neighbours[:,2]==(k+1)))[0][0]]
        point6 = current_neighbours[np.where((ijk_neighbours[:,0]==i)     & (ijk_neighbours[:,1]==(j+1)) & (ijk_neighbours[:,2]==(k+1)))[0][0]]
        point7 = current_neighbours[np.where((ijk_neighbours[:,0]==(i+1)) & (ijk_neighbours[:,1]==j+1)   & (ijk_neighbours[:,2]==(k+1)))[0][0]]
        point8 = current_neighbours[np.where((ijk_neighbours[:,0]==(i+1)) & (ijk_neighbours[:,1]==j)     & (ijk_neighbours[:,2]==(k+1)))[0][0]]
        

        # I dunno why hex are seen with triangular faces (only view is affected) may be be the element type of meshio?
        elems[idx,:] = np.array([point1, point2, point3, point4, point5, point6, point7, point8])

    _, idxs = np.unique(np.sort(copy.deepcopy(elems), 1), return_index=True, axis=0)     
    elems = elems[idxs,:]

    #Now we have  to delete unused points in the mesh and update the elems
    pointsUsed, inverseUsedIdxs   = np.unique(elems, return_inverse=True)
    newPoints     = points[pointsUsed,:]
    newPointsIdxs = np.arange(pointsUsed.shape[0])
    newElems      = newPointsIdxs[inverseUsedIdxs]
    newElems      = newElems.reshape((-1,8)) 

    # #Now we can get the node connections, ordeing like this nPointsx6 [i,:] = [i-,i+,j-,j+,k-,k+]
    # tree = KDTree(newPoints)    
    # idx_neighbours = tree.query_ball_point(newPoints, 1.1)
 
    # nodeConnections = np.ones((newPointsIdxs.shape[0],6), dtype=int) * -1 #if I use nan we'll have to switch to float -> more memory
    # idxMap = np.array([np.nan,np.nan,0,np.nan,1,2,np.nan,3,4,np.nan,5])
    # for idx, point_idx in enumerate(tqdm(idx_neighbours)):
    #     point_idx.remove(idx)
    #     currentDiff = newPoints[point_idx] - newPoints[idx]
    #     axisDir  = (currentDiff!=0).nonzero()[1]
    #     axisSign = np.sum(currentDiff, axis=1)
    #     encodedIdx = ((axisDir + 1) * 3) + axisSign
    #     nodeConnections[idx,idxMap[encodedIdx].astype(int)] = point_idx

    # with open(os.path.join(args.outPath, 'nodeConnections.pickle'), 'wb') as handle:
    #     pickle.dump(nodeConnections, handle)
    
    #We know put the correct spatial coordinates x,y,z if the voxel space was in mm (as common) the results is in mm
    newPoints = np.concatenate((newPoints, np.ones((newPoints.shape[0],1), dtype=int)), axis=1)
    newPoints = np.matmul(newPoints, affine)
    newPoints = newPoints[:,:3] * 1000 #pass to um

    cells = [("hexahedron", newElems)]
    mesh = meshio.Mesh(newPoints, cells=cells)
    mesh.write(args.outPath)

#REMEMBER
# Use paraview for surface extraction and triangulation of the surface.

if __name__ == '__main__':
    main()