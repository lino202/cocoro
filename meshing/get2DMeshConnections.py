import os  
import argparse
import numpy as np
import meshio
from tqdm import tqdm
from scipy.spatial import KDTree
import pickle

def main():

    parser = argparse.ArgumentParser(description="Options")
    parser.add_argument('--meshPath',type=str, required=True, help='path to data')
    parser.add_argument('--outPath',  type=str, required=True)
    args = parser.parse_args()

    mesh = meshio.read(args.meshPath)
    points = mesh.points
    thres = np.unique(np.abs(np.diff(points,axis=0)))[1]
    thres = thres * 2 -  thres * 0.5
    print("Threshold used for the search in getregQuadFDrelations {}".format(thres))

    #Now we can get the node connections, ordeing like this nPointsx8 [index,:] = [i,j+1 ; i+1,j+1 ; i+1,j ; i+1,j-1 ; i,j-1 ; i-1,j-1 ; i-1,j ; i-1,j+1]
    tree = KDTree(points)    
    idx_neighbours = tree.query_ball_point(points, thres)
 
    nodeConnections = np.ones((points.shape[0],8), dtype=int) * -1 #if I use nan we'll have to switch to float -> more memory
    # idxMap = np.array([np.nan,np.nan,0,np.nan,1,2,np.nan,3,4,np.nan,5])
    for idx, point_idx in enumerate(tqdm(idx_neighbours)):
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


    with open(os.path.join(args.outPath, 'nodeConnections.pickle'), 'wb') as handle:
        pickle.dump(nodeConnections, handle)
    

if __name__ == '__main__':
    main()



#     # TODO This might not been done here as it could be to slow
# def getregQuadFDrelations(points):

    
    # tree = KDTree(points)
    # res = tree.query_ball_point(points, thres)
    # resArr = np.zeros((res.shape[0],4))
    # for i in range(len(res)):
    #     res[i].remove(i)
    #     resNodeArray = np.ones(8)
    #     currentDiffs = points[res[i]] - points[i]
    #     if len(res[i]) > 8: raise ValueError("Wrong threshold, more than 4 neighs where found, point {}".format(i))
    #     if len(res[i])!=8:
    #         resArr[i] = [-1, -1, -1, -1, -1, -1, -1, -1]
    #     else:
    #         resArr[i] = res[i]
    # return resArr
    # # rbmVersors = rbmVersors[idxs,:]
    # # angles = angles[idxs]