import numpy as np
import os
import argparse


def main():

    parser = argparse.ArgumentParser(description="Options")
    parser.add_argument('--voxelData',type=str, required=True, help='path to data')
    parser.add_argument('--outPath',  type=str, required=True)
    args = parser.parse_args()

    dataPath = "/home/maxi/Documents/Practice/NumericMethods/Meshes/data/"
    div = 10
    originTuple = (0,0)
    endTuple = (5,5)
    triangle = False   #False = quad

    origin = np.array(originTuple).astype(float)
    end = np.array(endTuple).astype(float)
    # mesh = pymesh.generate_box_mesh(origin, end, div, using_simplex=triangle)
    # pymesh.save_mesh(os.path.join(dataPath,"2D_quad.obj"), mesh)

if __name__ == '__main__':
    main()