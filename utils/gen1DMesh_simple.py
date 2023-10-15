import numpy as np
import os
import meshio
import argparse

def getContinuosEdges(points):
    edges = np.array([])
    for nodeIdx in range(points.shape[0]-1):
        newEdge = np.array([[nodeIdx, nodeIdx+1]])
        edges = np.concatenate((edges, newEdge), axis=0) if edges.size else newEdge
    return edges

def main():

    parser = argparse.ArgumentParser(description="Options")
    parser.add_argument('--L',  type=float, required=True)
    parser.add_argument('--dx',  type=float, required=True)
    parser.add_argument('--name',  type=str, required=True)
    parser.add_argument('--outPath',  type=str, required=True)
    args = parser.parse_args()


    L = args.L
    dx = args.dx
    step = int(L/dx + 1)

    x = np.linspace(0,L,step)
    y = np.zeros(x.shape)
    z = np.zeros(x.shape)

    points = np.transpose(np.array([x,y,z]))
    edges = getContinuosEdges(points)


    point_data = {}
    vn = np.zeros((points.shape[0],3))
    vn[:,1] = 1
    point_data['vn'] = vn

    voi_init = np.ones(points.shape[0]) * -80
    point_data['voi_init'] = voi_init

    stim_width_vtxs = 25
    stim_nodes = np.zeros(points.shape[0])
    stim_nodes[:stim_width_vtxs] = 100
    stim_nodes[points.shape[0]-stim_width_vtxs:] = 200
    point_data['stim_nodes'] = stim_nodes

    stim_nodes_mag = np.zeros(points.shape[0])
    stim_nodes_mag[:stim_width_vtxs] = 0.0025
    stim_nodes_mag[points.shape[0]-stim_width_vtxs:] = 0.0025
    point_data['stim_nodes_mag'] = stim_nodes_mag

    stim_nodes_dur = np.zeros(points.shape[0])
    stim_nodes_dur[:stim_width_vtxs] = 1
    stim_nodes_dur[points.shape[0]-stim_width_vtxs:] = 1
    point_data['stim_nodes_dur'] = stim_nodes_dur


    cells = [
        ("line", edges)
    ]
    mesh = meshio.Mesh(points, cells, point_data=point_data)
    mesh.write(os.path.join(args.outPath, "1D_{}.vtk".format(args.name)))


if __name__ == '__main__':
    main()