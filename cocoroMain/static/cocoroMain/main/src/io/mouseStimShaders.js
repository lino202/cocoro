export function mouseStimHandlerLine( nVertexs, nRenderElems, workgroupSize, nWorkgroups){

    // Computes the closest point on segment AB to the line defined by point P and unit direction d

    return /*wgsl*/`

        struct Coords {
            x : f32,
            y : f32,
            z : f32,
        };

        struct Elem{
            a : u32,
            b : u32,
        };

        struct Ray{
            p : Coords,
            d : Coords,
        };
        
        @binding(0) @group(0) var<storage, read> mesh_vertexs : array<Coords, ${nVertexs}>;
        @binding(1) @group(0) var<storage, read> render_elems : array<Elem, ${nRenderElems}>;
        @binding(2) @group(0) var<storage, read> ray : Ray;
        @binding(3) @group(0) var<storage, read_write> per_elem_nearest_coords : array<Coords, ${nRenderElems}>;
        @binding(4) @group(0) var<storage, read_write> per_workgroup_dist : array<f32, ${nWorkgroups}>;
        @binding(5) @group(0) var<storage, read_write> per_workgroup_elem_idx : array<u32, ${nWorkgroups}>;
        
        var<workgroup> workgroup_values: array<f32, ${workgroupSize}>;
        var<workgroup> workgroup_indexes: array<u32, ${workgroupSize}>;

        const max_value:f32 = 3.40282346638528859812e+38; // f32 maximum

        @compute @workgroup_size(${workgroupSize})
        fn comp_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>, 
                     @builtin(local_invocation_id) LocalInvocationId: vec3<u32>,
                     @builtin(workgroup_id) WorkgroupID: vec3<u32>) {
            
            // Compute per elem distance and nearest on segment point---------------------------------------------------------
            // Segment direction vector: v = B - A
            let a_coords:Coords = mesh_vertexs[render_elems[GlobalInvocationID.x].a];
            let a_vec:vec3<f32> = vec3<f32>(a_coords.x, a_coords.y, a_coords.z);
            let b_coords:Coords = mesh_vertexs[render_elems[GlobalInvocationID.x].b];
            let v:vec3<f32> = vec3<f32>(b_coords.x - a_coords.x, b_coords.y - a_coords.y, b_coords.z - a_coords.z);

            //  Vector from line point P to segment start A: w = A - P
            let w:vec3<f32> = vec3<f32>(a_coords.x - ray.p.x, a_coords.y - ray.p.y, a_coords.z - ray.p.z);
            
            // Compute the perpendicular component of w and v relative to d:
            let ray_d:vec3<f32> = vec3<f32>(ray.d.x, ray.d.y, ray.d.z);
            var w_perp:vec3<f32> = w - dot(w, ray_d) * ray_d;
            var v_perp:vec3<f32> = v - dot(v, ray_d) * ray_d;
            
            var denom = dot(v_perp, v_perp);
            
            var t:f32 = 0.0;   // If denom == 0, the segment is parallel to d (or degenerate)
            if (denom > 1e-6){
                // Compute t* that minimizes the squared distance from Q(t) to the line
                t = -dot(w_perp, v_perp) / denom;
            }

            // Clamp t to lie within [0, 1] (i.e., on the segment)
            t = clamp(t, 0.0, 1.0);
            
            // Compute the closest point on the segment and its distance to the line
            let nearest_point:vec3<f32> = a_vec + t * v;
            per_elem_nearest_coords[GlobalInvocationID.x] = Coords(nearest_point.x, nearest_point.y, nearest_point.z);
    
            // Get the distance and found the minimum in the workgroup---------------------------------------------------------

            // Load data into shared memory, only if we are not out of the bounds
            let shortest_segment:vec3<f32> = w_perp + t * v_perp;
            let distance:f32 = sqrt(dot(shortest_segment, shortest_segment));
            workgroup_values[LocalInvocationId.x] = select(distance, max_value, GlobalInvocationID.x >= ${nRenderElems});
            workgroup_indexes[LocalInvocationId.x] = GlobalInvocationID.x;

            workgroupBarrier(); // Sync all threads before reduction
                
            // Parallel reduction in shared memory
            for (var current_size:u32 = ${workgroupSize} / 2; current_size > 0; current_size /= 2) {
                let other_value = workgroup_values[LocalInvocationId.x + current_size];
                let other_index = workgroup_indexes[LocalInvocationId.x + current_size];

                // Check if the other thread's value is smaller
                if (other_value < workgroup_values[LocalInvocationId.x]) {
                    workgroup_values[LocalInvocationId.x]  = other_value;
                    workgroup_indexes[LocalInvocationId.x] = other_index;
                } else if (other_value == workgroup_values[LocalInvocationId.x]) {
                    // Ensure we keep the smallest index in case of ties
                    workgroup_indexes[LocalInvocationId.x] = min(workgroup_indexes[LocalInvocationId.x], other_index);
                }

                workgroupBarrier(); // Sync before next step
            }
        
            // Store result from first thread of workgroup
            if (LocalInvocationId.x == 0) {
                per_workgroup_dist[WorkgroupID.x] = workgroup_values[0];
                per_workgroup_elem_idx[WorkgroupID.x] = workgroup_indexes[0];
            }

        }
        
    `;

} 


export function mouseStimHandlerTriangle( nVertexs, nRenderElems, workgroupSize, nWorkgroups){

    // Computes the closest point on segment AB to the line defined by point P and unit direction d

    return /*wgsl*/`

        struct Coords {
            x : f32,
            y : f32,
            z : f32,
        };

        struct Elem{
            a : u32,
            b : u32,
            c : u32,
        };

        struct Ray{
            p : Coords,
            d : Coords,
        };
        
        @binding(0) @group(0) var<storage, read> mesh_vertexs : array<Coords, ${nVertexs}>;
        @binding(1) @group(0) var<storage, read> render_elems : array<Elem, ${nRenderElems}>;
        @binding(2) @group(0) var<storage, read> ray : Ray;
        @binding(3) @group(0) var<storage, read_write> per_elem_nearest_coords : array<Coords, ${nRenderElems}>;
        @binding(4) @group(0) var<storage, read_write> per_workgroup_dist : array<f32, ${nWorkgroups}>;
        @binding(5) @group(0) var<storage, read_write> per_workgroup_elem_idx : array<u32, ${nWorkgroups}>;
        
        var<workgroup> workgroup_values: array<f32, ${workgroupSize}>;
        var<workgroup> workgroup_indexes: array<u32, ${workgroupSize}>;

        const max_value:f32 = 3.40282346638528859812e+38; // f32 maximum
        const EPSILON:f32 = 1.0e-8;

        @compute @workgroup_size(${workgroupSize})
        fn comp_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>, 
                     @builtin(local_invocation_id) LocalInvocationId: vec3<u32>,
                     @builtin(workgroup_id) WorkgroupID: vec3<u32>) {
            
            // Compute per elem distance intersection with Möller-Trumbore algo and get ray's intersection point per tri---------------------------------------------------------
            let v0:vec3<f32> = vec3<f32>(mesh_vertexs[render_elems[GlobalInvocationID.x].a].x, mesh_vertexs[render_elems[GlobalInvocationID.x].a].y, mesh_vertexs[render_elems[GlobalInvocationID.x].a].z);
            let v1:vec3<f32> = vec3<f32>(mesh_vertexs[render_elems[GlobalInvocationID.x].b].x, mesh_vertexs[render_elems[GlobalInvocationID.x].b].y, mesh_vertexs[render_elems[GlobalInvocationID.x].b].z);
            let v2:vec3<f32> = vec3<f32>(mesh_vertexs[render_elems[GlobalInvocationID.x].c].x, mesh_vertexs[render_elems[GlobalInvocationID.x].c].y, mesh_vertexs[render_elems[GlobalInvocationID.x].c].z);
            let ray_d:vec3<f32> = vec3<f32>(ray.d.x, ray.d.y, ray.d.z);
            let ray_origin:vec3<f32> = vec3<f32>(ray.p.x, ray.p.y, ray.p.z);

            let edge1:vec3<f32> = v1 - v0;
            let edge2:vec3<f32> = v2 - v0;

            let pvec:vec3<f32> = cross(ray_d, edge2);
            let det:f32 = dot(edge1, pvec);

            var must_compute:bool = true;
            
            if (abs(det) < EPSILON){
                must_compute = false; //ray is parallel to tri
            }
            
            let inv_det:f32 = 1 / det;
            let tvec:vec3<f32> = ray_origin - v0;
            
            let u:f32 = dot(tvec, pvec) * inv_det;
            if ((u < 0.0) || (u > 1.0)){
                must_compute = false;
            }
        
            let qvec:vec3<f32> = cross(tvec, edge1);
            
            let v:f32 = dot(ray_d, qvec) * inv_det;
            if ((v < 0.0) || (u + v > 1.0)){
                must_compute = false;
            }
        
            let t:f32 = dot(edge2, qvec) * inv_det;

            // default values
            var final_t:f32 = max_value;
            per_elem_nearest_coords[GlobalInvocationID.x] = Coords(max_value, max_value, max_value);
            
            if (must_compute){
                let intersection:vec3<f32> = ray_origin + t*ray_d;
                final_t = t;
                per_elem_nearest_coords[GlobalInvocationID.x] = Coords(intersection.x, intersection.y, intersection.z);
            }
            
            // Found the minimum t in the workgroup---------------------------------------------------------

            // Load data into shared memory, only if we are not out of the bounds
            workgroup_values[LocalInvocationId.x] = select(final_t, max_value, GlobalInvocationID.x >= ${nRenderElems});
            workgroup_indexes[LocalInvocationId.x] = GlobalInvocationID.x;

            workgroupBarrier(); // Sync all threads before reduction
                
            // Parallel reduction in shared memory
            for (var current_size:u32 = ${workgroupSize} / 2; current_size > 0; current_size /= 2) {
                let other_value = workgroup_values[LocalInvocationId.x + current_size];
                let other_index = workgroup_indexes[LocalInvocationId.x + current_size];

                // Check if the other thread's value is smaller
                if (other_value < workgroup_values[LocalInvocationId.x]) {
                    workgroup_values[LocalInvocationId.x]  = other_value;
                    workgroup_indexes[LocalInvocationId.x] = other_index;
                } else if (other_value == workgroup_values[LocalInvocationId.x]) {
                    // Ensure we keep the smallest index in case of ties
                    workgroup_indexes[LocalInvocationId.x] = min(workgroup_indexes[LocalInvocationId.x], other_index);
                }

                workgroupBarrier(); // Sync before next step
            }
        
            // Store result from first thread of workgroup
            if (LocalInvocationId.x == 0) {
                per_workgroup_dist[WorkgroupID.x] = workgroup_values[0];
                per_workgroup_elem_idx[WorkgroupID.x] = workgroup_indexes[0];
            }

        }
        
    `;

}

export function mouseStimHandlerComputeShader1(elemType, nVertexs, nRenderElems, workgroupSize, nWorkgroups){

    if(elemType == 'line'){
        return mouseStimHandlerLine(nVertexs, nRenderElems, workgroupSize, nWorkgroups);
    }else{
        return mouseStimHandlerTriangle(nVertexs, nRenderElems, workgroupSize, nWorkgroups);
    }

}

export function reductionComputeShader(nWorkgroupsOld, nWorkgroups, workgroupSize){

    // Keeps with the reduction until we have an amount of minimum values lower than the maxWorkgroupSize the gpu can give us
    // so we have in the 0 position of the buffer the minimum index and distance value that can be use with per_elem_nearest_coords

    return /*wgsl*/`

        @binding(0) @group(0) var<storage, read_write> per_workgroup_dist_in : array<f32, ${nWorkgroupsOld}>;
        @binding(1) @group(0) var<storage, read_write> per_workgroup_elem_idx_in : array<u32, ${nWorkgroupsOld}>;
        @binding(2) @group(0) var<storage, read_write> per_workgroup_dist_out : array<f32, ${nWorkgroups}>;
        @binding(3) @group(0) var<storage, read_write> per_workgroup_elem_idx_out : array<u32, ${nWorkgroups}>;
        
        var<workgroup> workgroup_values: array<f32, ${workgroupSize}>;
        var<workgroup> workgroup_indexes: array<u32, ${workgroupSize}>;

        const max_value:f32 = 3.40282346638528859812e+38; // f32 maximum

        @compute @workgroup_size(${workgroupSize})
        fn comp_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>, 
                     @builtin(local_invocation_id) LocalInvocationId: vec3<u32>,
                     @builtin(workgroup_id) WorkgroupID: vec3<u32>) {
            

            // Load data into shared memory, only if we are not out of the bounds
            workgroup_values[LocalInvocationId.x] = select(per_workgroup_dist_in[GlobalInvocationID.x], max_value, GlobalInvocationID.x >= ${nWorkgroupsOld});
            workgroup_indexes[LocalInvocationId.x] = select(per_workgroup_elem_idx_in[GlobalInvocationID.x], 0, GlobalInvocationID.x >= ${nWorkgroupsOld}); // the value out of bound should not care if this done good

            workgroupBarrier(); // Sync all threads before reduction
                
            // Parallel reduction in shared memory
            for (var current_size:u32 = ${workgroupSize} / 2; current_size > 0; current_size /= 2) {
                let other_value = workgroup_values[LocalInvocationId.x + current_size];
                let other_index = workgroup_indexes[LocalInvocationId.x + current_size];

                // Check if the other thread's value is smaller
                if (other_value < workgroup_values[LocalInvocationId.x]) {
                    workgroup_values[LocalInvocationId.x]  = other_value;
                    workgroup_indexes[LocalInvocationId.x] = other_index;
                } else if (other_value == workgroup_values[LocalInvocationId.x]) {
                    // Ensure we keep the smallest index in case of ties
                    workgroup_indexes[LocalInvocationId.x] = min(workgroup_indexes[LocalInvocationId.x], other_index);
                }

                workgroupBarrier(); // Sync before next step
            }
        
            // Store result from first thread of workgroup
            if (LocalInvocationId.x == 0) {
                per_workgroup_dist_out[WorkgroupID.x] = workgroup_values[0];
                per_workgroup_elem_idx_out[WorkgroupID.x] = workgroup_indexes[0];
            }

        }
        
    `;

}


export function mouseStimHandlerComputeShader2(nNodes, nRenderElems, workgroupSize){

    // Computes the points under stimulation due to the click

    return /*wgsl*/`

        struct Coords {
            x : f32,
            y : f32,
            z : f32,
        };

        struct StimParams {
            curr_amp : f32,
            radius : f32,
        };

        @binding(0) @group(0) var<storage, read> mesh_points : array<Coords, ${nNodes}>;   // this is not vertexs and this should be in the same space as the other coords (clip space) REMEMBER!!
        @binding(1) @group(0) var<storage, read> per_elem_nearest_coords : array<Coords, ${nRenderElems}>;
        @binding(2) @group(0) var<storage, read> per_workgroup_elem_idx : array<u32, 1>;             // this last buffer of the reduction has length 1
        @binding(3) @group(0) var<storage, read> stim_params : StimParams;
        @binding(4) @group(0) var<storage, read_write> mouse_stim : array<f32, ${nNodes}>;
        

        @compute @workgroup_size(${workgroupSize})
        fn comp_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
            
            if(GlobalInvocationID.x >= ${nNodes}) {return;}
            
            // ATTENTION if the ray did not intersect any triangle the per_workgroup_elem_idx[0] should be 0 and the stim_centre should be really far away (max_value, max_value, max_value);
            // so the radius will not stim any node as we are working withe mesh_points in the [-1,1] range
            let stim_centre:Coords = per_elem_nearest_coords[per_workgroup_elem_idx[0]];
            
            let stim_centre_to_point:vec3<f32> = vec3<f32>(mesh_points[GlobalInvocationID.x].x - stim_centre.x, mesh_points[GlobalInvocationID.x].y - stim_centre.y, mesh_points[GlobalInvocationID.x].z - stim_centre.z);
            let distance:f32 = length(stim_centre_to_point);

            if (distance <= stim_params.radius){
                mouse_stim[GlobalInvocationID.x] = stim_params.curr_amp;
            }
            else{   // we need to set the value to false in case the point was previously set to true and we are dragging ;)
                mouse_stim[GlobalInvocationID.x] = 0.0;
            }

        }
        
    `;

}



