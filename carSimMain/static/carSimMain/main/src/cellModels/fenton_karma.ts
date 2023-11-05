
export const cellTypesFK = ['BR','GP', 'MBR', 'MLR-1']

// Here we totally have to rethink this to make it less repetitive and also
// we might need to use interfaces for extending the properties that are common
// as n_perios and t

export const cellModelParamsFKBR = {
    states:{
        u : 0,
        v : 1,
        w : 1,
        Vm : -85,
        t : 0
    },
    constants:{
        Cm : 1,
        V_0 : -85,
        V_fi : 15,
        u_c : 0.13,
        u_csi : 0.85,
        k : 10,
        u_v : 0.04,
        g_fi_max : 4,
        tau_v1_minus : 1250,
        tau_v2_minus : 19.6,
        tau_v_plus : 3.33,
        tau_0 : 12.5,
        tau_r : 33.33,
        tau_si : 29,
        tau_w_minus : 41,
        tau_w_plus : 870,
        // tau_d : 1/4
    },
    stim:{
        period : 1000,
        amp: 20,
        dur: 1,
        start: 10
    }
}


export const cellModelParamsFKGP = {
    states:{
        u : 0,
        v : 1,
        w : 1,
        Vm : -85,
        t : 0
    },
    constants:{
        Cm : 1,
        V_0 : -85,
        V_fi : 15,
        u_c : 0.13,
        u_csi : 0.85,
        k : 10,
        u_v : 0.025,
        g_fi_max : 8.7,
        tau_v1_minus : 333,
        tau_v2_minus : 40,
        tau_v_plus : 10,
        tau_0 : 12.5,
        tau_r : 25,
        tau_si : 22.22,
        tau_w_minus : 65,
        tau_w_plus : 1000,
        // tau_d : 1/8.7
    },
    stim:{
        period : 1000,
        amp: 20,
        dur: 1,
        start: 10
    }
}


export const cellModelParamsFKMBR = {
    states:{
        u : 0,
        v : 1,
        w : 1,
        Vm : -85,
        t : 0
    },
    constants:{
        Cm : 1,
        V_0 : -85,
        V_fi : 15,
        u_c : 0.13,
        u_csi : 0.85,
        k : 10,
        u_v : 0.055,
        g_fi_max : 4,
        tau_v1_minus : 1000,
        tau_v2_minus : 19.2,
        tau_v_plus : 3.33,
        tau_0 : 8.3,
        tau_r : 50,
        tau_si : 44.84,
        tau_w_minus : 11,
        tau_w_plus : 667,
        // tau_d : 1/4
    },
    stim:{
        period : 1000,
        amp: 20,
        dur: 1,
        start: 10
    }

}


export const cellModelParamsFKMLR1 = {
    states:{
        u : 0,
        v : 1,
        w : 1,
        Vm : -85,
        t : 0
    },
    constants:{
        Cm : 1,
        V_0 : -85,
        V_fi : 15,
        u_c : 0.13,
        u_csi : 0.85,
        k : 10,
        u_v : 0,
        g_fi_max : 5.8,   
        tau_v1_minus : 18.2,
        tau_v2_minus : 18.2,
        tau_v_plus : 10,
        tau_0 : 12.5,
        tau_r : 130,
        tau_si : 127,
        tau_w_minus : 80,
        tau_w_plus : 1020, 
        // tau_d : 1/5.8
    },
    stim:{
        period : 1000,
        amp: 20,
        dur: 1,
        start: 10
    }
}


