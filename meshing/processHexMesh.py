import os  
import argparse
import numpy as np
import meshio
from tqdm import tqdm
import copy
import time
import vtk
from scipy.spatial import KDTree
from vtk.util import numpy_support # type: ignore


# def get3FacetsFromCube(cell, points, idx):
#         '''This function gets the 3 facets that have the point of index idx (0-7) as corner'''
        
#         quadCells      = np.ones((3,4), dtype=int) - 1
#         idxs           = np.arange(8)
#         otherNodesIdxs = cell[idxs!=idx]
#         vecs           = points[cell[idxs==idx],:] - points[otherNodesIdxs,:]

#         # We need to get rid of precision error
#         dists  = np.round(np.linalg.norm(vecs,axis=1) * 10000)
#         unique = np.unique(dists, return_counts=True, return_inverse=True)
#         if unique[0].shape[0] != 3: raise ValueError("Wrong unique distances between nodes in hexahedron!")

#         # Make the first three faces
#         # We identified the 4th point by cheking if the vector is parallel to the place made by the other 3 points
#         nearPointsIdxs = (unique[1]==0).nonzero()[0]
#         farPointsIdxs  = (unique[1]==1).nonzero()[0]
#         normal1 = np.cross(vecs[nearPointsIdxs[0]], vecs[nearPointsIdxs[1]])
#         normal2 = np.cross(vecs[nearPointsIdxs[0]], vecs[nearPointsIdxs[2]])
#         normal3 = np.cross(vecs[nearPointsIdxs[1]], vecs[nearPointsIdxs[2]])

#         #Quad 1
#         fourthPoint = farPointsIdxs[np.argmin(np.abs(np.sum(np.multiply(vecs[farPointsIdxs], normal1),axis=1)))]
#         quadCells[0,:] =  np.array([cell[idx], otherNodesIdxs[nearPointsIdxs[0]], otherNodesIdxs[fourthPoint], otherNodesIdxs[nearPointsIdxs[1]]])
#         #Quad 2
#         fourthPoint = farPointsIdxs[np.argmin(np.abs(np.sum(np.multiply(vecs[farPointsIdxs], normal2),axis=1)))]
#         quadCells[1,:] =  np.array([cell[idx], otherNodesIdxs[nearPointsIdxs[2]], otherNodesIdxs[fourthPoint], otherNodesIdxs[nearPointsIdxs[0]]])
#         #Quad 3
#         fourthPoint = farPointsIdxs[np.argmin(np.abs(np.sum(np.multiply(vecs[farPointsIdxs], normal3),axis=1)))]
#         quadCells[2,:] =  np.array([cell[idx], otherNodesIdxs[nearPointsIdxs[1]], otherNodesIdxs[fourthPoint], otherNodesIdxs[nearPointsIdxs[2]]])

#         return quadCells


def main():

    parser = argparse.ArgumentParser(description="Options")
    parser.add_argument('--filePath',type=str, required=True, help='path to data')
    parser.add_argument('--outPath',  type=str, required=True)
    args = parser.parse_args()

    # Read Mesh
    reader = vtk.vtkUnstructuredGridReader()
    reader.SetFileName(args.filePath)
    reader.Update()

    mesh    = reader.GetOutput()
    nPoints = mesh.GetNumberOfPoints()
    points  = numpy_support.vtk_to_numpy(mesh.GetPoints().GetData())
    dx = 250
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

    print(nodeConnections)




                


            




if __name__ == '__main__':
    start = time.time()
    main()
    print("Total time was {} s".format(time.time()-start))