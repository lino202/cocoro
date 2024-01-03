

export const gaurDefinitions = /*wgsl*/`

    struct States {
        CICR__A : f32,
        CICR__Jrel1 : f32,
        CICR__Jrel2 : f32,
        ionic_concentrations__cacsr : f32,
        ionic_concentrations__cai : f32,
        ionic_concentrations__cai2 : f32,
        ionic_concentrations__cajsr : f32,
        ionic_concentrations__cass : f32,
        CICR__tjsrol : f32,
        CaMK__CaMKt : f32,
        ionic_concentrations__ki : f32,
        ionic_concentrations__nai : f32,
        vm : f32,
        ICaL__d : f32,
        ICaL__fca : f32,
        ICaL__ff : f32,
        ICaL__fs : f32,
        ionic_concentrations__kss : f32,
        ionic_concentrations__nass : f32,
        IKr__xr : f32,
        IKs__xs1 : f32,
        IKs__xs2 : f32,
        INaL__hl : f32,
        INaL__ml : f32,
        ITo__aa : f32,
        I_Na__h : f32,
        I_Na__j : f32,
        I_Na__m : f32,
        ionic_concentrations__cansr : f32,
        t : f32
    }

    struct Constants {
        cm : f32,
        beta : f32,
        sigma_long : f32,
        sigma_trans_2_long : f32,
        cell__F : f32,
        CaMK__KmCaMK : f32,
        CICR__SOICR : f32,
        CICR__grelbarjsrol : f32,
        CICR__tau_gap : f32,
        CICR__tauoff : f32,
        CICR__tauon : f32,
        CaMK__CaMKo : f32,
        CaMK__KmCaM : f32,
        CaMK__PKNa : f32,
        cell__R : f32,
        cell__T : f32,
        CaMK__aCaMK : f32,
        CaMK__bCaMK : f32,
        cell__cli : f32,
        cell__clo : f32,
        cell__ko : f32,
        cell__nao : f32,
        ICaL__PCa : f32,
        ICaL__vhalf_d : f32,
        ICaL__zca : f32,
        IKb__GKb : f32,
        IKs__GKs : f32,
        INaCa_i__KmCaAct : f32,
        INaCa_i__kasymm : f32,
        INaCa_i__kcaoff : f32,
        INaCa_i__kcaon : f32,
        INaCa_i__kna1 : f32,
        INaCa_i__kna2 : f32,
        INaCa_i__kna3 : f32,
        INaCa_i__qca : f32,
        INaCa_i__qna : f32,
        INaCa_i__wca : f32,
        INaCa_i__wna : f32,
        INaCa_i__wnaca : f32,
        INaCa_i__zna : f32,
        INaK__H : f32,
        INaK__Khp : f32,
        INaK__Kki : f32,
        INaK__Kko : f32,
        INaK__Kmgatp : f32,
        INaK__Knai0 : f32,
        INaK__Knao0 : f32,
        INaK__Knap : f32,
        INaK__Kxkur : f32,
        INaK__MgADP : f32,
        INaK__MgATP : f32,
        INaK__eP : f32,
        INaK__k1m : f32,
        INaK__k1p : f32,
        INaK__k2m : f32,
        INaK__k2p : f32,
        INaK__k3m : f32,
        INaK__k3p2 : f32,
        INaK__k4m : f32,
        INaK__k4p2 : f32,
        INaK__zk : f32,
        INaL__GNaL : f32,
        INaL__tau_hl : f32,
        INab__PNab : f32,
        I_Na__GNa : f32,
        IpCa__GpCa : f32,
        SR_uptake__BSLmax : f32,
        SR_uptake__BSRmax : f32,
        SR_uptake__KmBSL : f32,
        SR_uptake__KmBSR : f32,
        SR_uptake__cmdnmax : f32,
        SR_uptake__csqnmax : f32,
        SR_uptake__kmcmdn : f32,
        SR_uptake__kmcsqn : f32,
        SR_uptake__kmtrpn : f32,
        SR_uptake__trpnmax : f32,
        cell__L : f32,
        cell__pi : f32,
        cell__rad : f32,
        cell__vmyo1frac : f32,
        INaK__Pnak : f32,
        ICaL__vhalff : f32,
        ICab__PCab : f32,
        IK1__GK1 : f32,
        IKr__GKr : f32,
        INaK__delta : f32,
        INaCa_i__Gncx : f32,
        ITo__Gto : f32,
    }
`;

export function gaurCoreCompute(simScale){

    var statesString;
    if (simScale == 'Cellular'){
        statesString = 'states';
    }else if (simScale == 'Tissue'){
        statesString = 'states[idx]';
    }else{
        throw new Error(`Unknown Simulation Scale "${simScale}"`)
    }
    
    return /*wgsl*/`
        // Compute constants from other constants
        var CaMK__ECl:f32 =  (( constants.cell__R * constants.cell__T) / constants.cell__F) * log(constants.cell__cli /constants.cell__clo);
        var ICaL__PCaK:f32 =  0.000357400*constants.ICaL__PCa;
        var ICaL__PCaNa:f32 =  0.00125000*constants.ICaL__PCa;
        var INaCa_i__h10:f32 = (constants.INaCa_i__kasymm+1.00000)+ (constants.cell__nao/constants.INaCa_i__kna1)*(1.00000+constants.cell__nao/constants.INaCa_i__kna2);
        var INaCa_i__h11:f32 = ( constants.cell__nao*constants.cell__nao)/( ( INaCa_i__h10*constants.INaCa_i__kna1)*constants.INaCa_i__kna2);
        var INaCa_i__h12:f32 = 1.00000/INaCa_i__h10;
        var INaCa_i__k2:f32 = constants.INaCa_i__kcaoff;
        var INaCa_i__k5:f32 = constants.INaCa_i__kcaoff;
        var INaCa_ss__h101:f32 = (constants.INaCa_i__kasymm+1.00000)+ (constants.cell__nao/constants.INaCa_i__kna1)*(1.00000+constants.cell__nao/constants.INaCa_i__kna2);
        var INaCa_ss__h1111:f32 = ( constants.cell__nao*constants.cell__nao)/( ( INaCa_ss__h101*constants.INaCa_i__kna1)*constants.INaCa_i__kna2);
        var INaCa_ss__h121:f32 = 1.00000/INaCa_ss__h101;
        var INaCa_ss__k21:f32 = constants.INaCa_i__kcaoff;
        var INaCa_ss__k51:f32 = constants.INaCa_i__kcaoff;
        var INaK__a2:f32 = constants.INaK__k2p;
        var INaK__a4:f32 = (( constants.INaK__k4p2*constants.INaK__MgATP)/constants.INaK__Kmgatp)/(1.00000+constants.INaK__MgATP/constants.INaK__Kmgatp);
        var INaK__b1:f32 =  constants.INaK__k1m*constants.INaK__MgADP;
        var cell__Ageo:f32 =  ( ( 2.00000*constants.cell__pi)*constants.cell__rad)*constants.cell__rad+ ( ( 2.00000*constants.cell__pi)*constants.cell__rad)*constants.cell__L;
        var cell__Acap:f32 =  2.00000*cell__Ageo;
        var cell__cao:f32 =  1.00000*1.80000;
        var INaCa_i__k1:f32 =  ( INaCa_i__h12*cell__cao)*constants.INaCa_i__kcaon;
        var INaCa_ss__k11:f32 =  ( INaCa_ss__h121*cell__cao)*constants.INaCa_i__kcaon;
        var cell__vcell:f32 =  ( ( ( 1000.00*constants.cell__pi)*constants.cell__rad)*constants.cell__rad)*constants.cell__L;
        var cell__vjsr:f32 = ( 0.00480000*cell__vcell)/2.00000;
        var cell__vcsr:f32 = cell__vjsr;
        var cell__vmyo:f32 =  0.680000*cell__vcell;
        var cell__vmyo1:f32 =  cell__vmyo*constants.cell__vmyo1frac;
        var cell__vmyo2:f32 = cell__vmyo - cell__vmyo1;
        var cell__vnsr:f32 =  0.0552000*cell__vcell;
        var cell__vnsr1:f32 = cell__vnsr/2.00000;
        var cell__vnsr2:f32 = cell__vnsr/2.00000;
        var cell__vss:f32 = ( 0.0200000*cell__vcell)/2.00000;
        
        // Actually compute the ionic model 
        // New subvariables are defined and currents have the prefix curr_
        var CICR__diff_A:f32;
        if (${statesString}.CICR__tjsrol<5.0){
            CICR__diff_A = -${statesString}.CICR__A/0.1;
        } else {
            CICR__diff_A = 1.0;
        }

        var CICR__diff_tjsrol:f32;
        if ((${statesString}.ionic_concentrations__cajsr>constants.CICR__SOICR) & (${statesString}.CICR__A>45.0)){
            CICR__diff_tjsrol = -${statesString}.CICR__tjsrol/0.001;
        } else {
            CICR__diff_tjsrol = 1.0;
        }

        var INaL__hl_inf:f32 = 1.00000/(1.00000+exp((${statesString}.vm+91.0000)/6.10000));

        var ICaL__d_inf:f32 = 1.00000/(1.00000+exp( - (${statesString}.vm - constants.ICaL__vhalf_d)/6.20000));
        var ICaL__tau_d:f32 = 0.600000+1.00000/(exp(  - 0.0500000*(${statesString}.vm+6.00000))+exp( 0.0900000*(${statesString}.vm+14.0000)));

        var IKr__tau_xr:f32 = 12.9800+1.00000/( 0.365200*exp((${statesString}.vm - 31.6600)/3.86900)+ 4.12300e-05*exp( - (${statesString}.vm - 47.7800)/20.3800));
        var IKr__xr_inf:f32 = 1.00000/(1.00000+exp( - (${statesString}.vm+56.8000)/17.8000));

        var ITo__alpha_aa:f32 = 0.0250000/(1.00000+exp((${statesString}.vm+58.0000)/5.00000));
        var ITo__beta_aa:f32 = 1.00000/( 5.00000*(1.00000+exp((${statesString}.vm+19.0000)/ - 9.00000)));
        var ITo__aa_inf:f32 = ITo__alpha_aa / (ITo__alpha_aa + ITo__beta_aa);
        var ITo__tau_aa:f32 = 1.00000 / (ITo__alpha_aa + ITo__beta_aa);

        var ICaL__f_inf:f32 = 1.00000/(1.00000+exp((${statesString}.vm - constants.ICaL__vhalff)/4.90000))+0.350000/(1.00000+exp((45.0000 - ${statesString}.vm)/20.0000));
        var ICaL__ff_inf:f32 = ICaL__f_inf;
        var ICaL__tau_ff:f32 = 7.00000+1.00000/( 0.00450000*exp( - (${statesString}.vm+20.0000)/10.0000)+ 0.00450000*exp((${statesString}.vm+20.0000)/10.0000));

        var ICaL__fs_inf:f32 = ICaL__f_inf;
        var ICaL__tau_fs:f32 = 70.0000+1.00000/( 3.50000e-05*exp( - (${statesString}.vm+5.00000)/4.00000)+ 3.50000e-05*exp((${statesString}.vm+5.00000)/6.00000));

        var IKs__tau_xs1:f32 = 300.000+1.00000/( 1.00000e-06*exp((${statesString}.vm+50.0000)/20.0000)+ 0.0400000*exp( - (${statesString}.vm+50.0000)/20.0000));
        var IKs__xs1_inf:f32 = 1.00000/(1.00000+exp( - (${statesString}.vm - 25.1000)/37.1000));

        var IKs__tau_xs2:f32 = 1.00000/( 0.0100000*exp((${statesString}.vm - 50.0000)/20.0000)+ 0.0193000*exp( - (${statesString}.vm+66.5400)/31.0000));
        var IKs__xs2_inf:f32 = IKs__xs1_inf;

        var INaL__aml:f32;
        if (${statesString}.vm == -47.1300) {
            INaL__aml =  0.32 * 10.0;
        } else {
            INaL__aml =  0.32 * -((${statesString}.vm+47.13)/(exp(-0.1*(${statesString}.vm+47.13)) - 1.00000));
        }
        var INaL__bml:f32 =  0.0800000*exp( - ${statesString}.vm/11.0000);
        var INaL__ml_inf:f32 = INaL__aml/(INaL__aml+INaL__bml);
        var INaL__tau_ml:f32 = 1.00000/(INaL__aml+INaL__bml);

        var I_Na__m_inf:f32 = 1.00000/( (1.00000+exp(( - 56.8600 - ${statesString}.vm)/9.03000))*(1.00000+exp(( - 56.8600 - ${statesString}.vm)/9.03000)));
        var I_Na__aa_m:f32 = 1.00000/(1.00000+exp(( - 60.0000 - ${statesString}.vm)/5.00000));
        var I_Na__bb_m:f32 = 0.100000/(1.00000+exp((${statesString}.vm+35.0000)/5.00000))+0.100000/(1.00000+exp((${statesString}.vm - 50.0000)/200.000));
        var I_Na__tau_m:f32 =  I_Na__aa_m*I_Na__bb_m;

        
        var CaMK__CaMKb:f32 = ( constants.CaMK__CaMKo*(1.00000 - ${statesString}.CaMK__CaMKt))/(1.00000+constants.CaMK__KmCaM/${statesString}.ionic_concentrations__cass);
        var CaMK__diff_CaMKt:f32 =  ( constants.CaMK__aCaMK*CaMK__CaMKb)*(CaMK__CaMKb+${statesString}.CaMK__CaMKt) -  constants.CaMK__bCaMK*${statesString}.CaMK__CaMKt;

        var I_Na__h_inf:f32 = 1.00000/( (1.00000+exp((${statesString}.vm+71.5500)/7.43000))*(1.00000+exp((${statesString}.vm+71.5500)/7.43000)));
        var I_Na__aa_h:f32;
        var I_Na__bb_h:f32;
        var I_Na__aa_j:f32;
        var I_Na__bb_j:f32;
        if (${statesString}.vm >= -40.0) {
            I_Na__aa_h =  0.0;
            I_Na__bb_h =  0.770000/( 0.130000*(1.00000+exp(-(${statesString}.vm+10.6600)/11.1000)));
            I_Na__aa_j =  0.0;
            I_Na__bb_j = ( 0.600000*exp( 0.0570000*${statesString}.vm))/(1.00000+exp(  - 0.100000*(${statesString}.vm+32.0000)));
        } else {
            I_Na__aa_h =  0.057*exp(-(${statesString}.vm+80.0)/6.8);
            I_Na__bb_h =  2.70000*exp( 0.0790000*${statesString}.vm)+ 310000.*exp( 0.348500*${statesString}.vm);
            I_Na__aa_j = ( (  - 25428.0*exp( 0.244400*${statesString}.vm) -  6.94800e-06*exp(  - 0.0439100*${statesString}.vm))*(${statesString}.vm+37.7800))/(1.00000+exp( 0.311000*(${statesString}.vm+79.2300)));
            I_Na__bb_j = ( 0.0242400*exp(  - 0.0105200*${statesString}.vm))/(1.00000+exp(  - 0.137800*(${statesString}.vm+40.1400)));
        }
        var I_Na__tau_h:f32 = 1.00000/(I_Na__aa_h+I_Na__bb_h);
        var I_Na__j_inf:f32 = I_Na__h_inf;
        var I_Na__tau_j:f32 = 1.00000/(I_Na__aa_j+I_Na__bb_j);
        
        var CaMK__vfrt:f32 = ( ${statesString}.vm*constants.cell__F)/( constants.cell__R*constants.cell__T);
        var ICaL__PhiCaL:f32;
        if (${statesString}.vm==0.0) {
            ICaL__PhiCaL =  ( ( 2.00000*constants.cell__F)*( ${statesString}.ionic_concentrations__cass*exp( 2.00000*(( ${statesString}.vm*constants.cell__F)/( constants.cell__R*constants.cell__T))) -  0.341000*cell__cao))* 1.0 ;
        } else {
            ICaL__PhiCaL =  ( ( 2.00000*constants.cell__F)*( ${statesString}.ionic_concentrations__cass*exp( 2.00000*(( ${statesString}.vm*constants.cell__F)/( constants.cell__R*constants.cell__T))) -  0.341000*cell__cao))*( 2.00000*CaMK__vfrt)/(exp( 2.00000*CaMK__vfrt) - 1.00000);
        }
        
        var ICaL__f:f32 =  ${statesString}.ICaL__ff*${statesString}.ICaL__fs;
        var curr_ICaL:f32 =  ( ( ( constants.ICaL__PCa*ICaL__PhiCaL)*${statesString}.ICaL__d)*ICaL__f)*${statesString}.ICaL__fca;
        var ICaL__fca_inf:f32;
        if (curr_ICaL > 0.0) {
            ICaL__fca_inf = (0.300000/(1.00000 - 0.0)+0.550000/(1.00000+${statesString}.ionic_concentrations__cass/0.00300000))+0.150000;
        } else {
            ICaL__fca_inf = (0.300000/(1.00000 - curr_ICaL/0.0500000)+0.550000/(1.00000+${statesString}.ionic_concentrations__cass/0.00300000))+0.150000;
        }
        
        var CaMK__CaMKa:f32 = CaMK__CaMKb+${statesString}.CaMK__CaMKt;
        var CaMK__CaMK_f:f32 = 1.00000/(1.00000+constants.CaMK__KmCaMK/CaMK__CaMKa);
        var ICaL__tau_fca:f32 = ( 10.0000*CaMK__CaMK_f+0.500000)+1.00000/(1.00000+${statesString}.ionic_concentrations__cass/0.00300000);
        
        var CaMK__EK:f32 =  (( constants.cell__R*constants.cell__T)/constants.cell__F)*log(constants.cell__ko/${statesString}.ionic_concentrations__ki);
        var IK1__rk1:f32 = 1.00000/(1.00000+exp(((${statesString}.vm+79.3000) -  2.60000*constants.cell__ko)/19.6000));
        var curr_IK1:f32 =  ( ( constants.IK1__GK1*pow((constants.cell__ko/5.40000), 1.0 / 2))*IK1__rk1)*(${statesString}.vm - CaMK__EK);
        var IKb__xkb:f32 = 1.00000/(1.00000+exp( - (${statesString}.vm - 14.4800)/18.3400));
        var curr_IKb:f32 =  ( constants.IKb__GKb*IKb__xkb)*(${statesString}.vm - CaMK__EK);
        var IKr__rkr:f32 = 1.00000/(1.00000+exp((${statesString}.vm+22.0000)/15.0000));
        var curr_IKr:f32 =  ( ( ( constants.IKr__GKr*pow((constants.cell__ko/5.40000), 1.0 / 2))*${statesString}.IKr__xr)*IKr__rkr)*(${statesString}.vm - CaMK__EK);
        var CaMK__EKs:f32 =  (( constants.cell__R*constants.cell__T)/constants.cell__F)*log((constants.cell__ko+ constants.CaMK__PKNa*constants.cell__nao)/(${statesString}.ionic_concentrations__ki+ constants.CaMK__PKNa*${statesString}.ionic_concentrations__nai));
        var IKs__KsCa:f32 = 1.00000+0.600000/(1.00000+pow(3.80000e-05/${statesString}.ionic_concentrations__cai, 1.40000));
        var curr_IKs:f32 =  ( ( ( constants.IKs__GKs*IKs__KsCa)*${statesString}.IKs__xs1)*${statesString}.IKs__xs2)*(${statesString}.vm - CaMK__EKs);
        var INaK__Knai:f32 =  constants.INaK__Knai0*exp(( ( constants.INaK__delta*${statesString}.vm)*constants.cell__F)/( ( 3.00000*constants.cell__R)*constants.cell__T));
        var INaK__a1:f32 = ( constants.INaK__k1p*( ( (${statesString}.ionic_concentrations__nai/INaK__Knai)*(${statesString}.ionic_concentrations__nai/INaK__Knai))*(${statesString}.ionic_concentrations__nai/INaK__Knai)))/(( ( (1.00000+${statesString}.ionic_concentrations__nai/INaK__Knai)*(1.00000+${statesString}.ionic_concentrations__nai/INaK__Knai))*(1.00000+${statesString}.ionic_concentrations__nai/INaK__Knai)+ (1.00000+${statesString}.ionic_concentrations__ki/constants.INaK__Kki)*(1.00000+${statesString}.ionic_concentrations__ki/constants.INaK__Kki)) - 1.00000);
        var INaK__Knao:f32 =  constants.INaK__Knao0*exp(( ( (1.00000 - constants.INaK__delta)*${statesString}.vm)*constants.cell__F)/( ( 3.00000*constants.cell__R)*constants.cell__T));
        var INaK__b2:f32 = ( constants.INaK__k2m*( ( (constants.cell__nao/INaK__Knao)*(constants.cell__nao/INaK__Knao))*(constants.cell__nao/INaK__Knao)))/(( ( (1.00000+constants.cell__nao/INaK__Knao)*(1.00000+constants.cell__nao/INaK__Knao))*(1.00000+constants.cell__nao/INaK__Knao)+ (1.00000+constants.cell__ko/constants.INaK__Kko)*(1.00000+constants.cell__ko/constants.INaK__Kko)) - 1.00000);
        var INaK__P:f32 = constants.INaK__eP/(((1.00000+constants.INaK__H/constants.INaK__Khp)+${statesString}.ionic_concentrations__nai/constants.INaK__Knap)+${statesString}.ionic_concentrations__ki/constants.INaK__Kxkur);
        var INaK__b3:f32 = ( ( constants.INaK__k3m*INaK__P)*constants.INaK__H)/(1.00000+constants.INaK__MgATP/constants.INaK__Kmgatp);
        var INaK__b4:f32 = ( constants.INaK__k4m*( (${statesString}.ionic_concentrations__ki/constants.INaK__Kki)*(${statesString}.ionic_concentrations__ki/constants.INaK__Kki)))/(( ( (1.00000+${statesString}.ionic_concentrations__nai/INaK__Knai)*(1.00000+${statesString}.ionic_concentrations__nai/INaK__Knai))*(1.00000+${statesString}.ionic_concentrations__nai/INaK__Knai)+ (1.00000+${statesString}.ionic_concentrations__ki/constants.INaK__Kki)*(1.00000+${statesString}.ionic_concentrations__ki/constants.INaK__Kki)) - 1.00000);
        var INaK__x12:f32 = (( ( INaK__a4*INaK__a1)*INaK__a2+ ( INaK__b2*INaK__b4)*INaK__b3)+ ( INaK__a2*INaK__b4)*INaK__b3)+ ( INaK__b3*INaK__a1)*INaK__a2;
        var INaK__a3:f32 = ( constants.INaK__k3p2*( (constants.cell__ko/constants.INaK__Kko)*(constants.cell__ko/constants.INaK__Kko)))/(( ( (1.00000+constants.cell__nao/INaK__Knao)*(1.00000+constants.cell__nao/INaK__Knao))*(1.00000+constants.cell__nao/INaK__Knao)+ (1.00000+constants.cell__ko/constants.INaK__Kko)*(1.00000+constants.cell__ko/constants.INaK__Kko)) - 1.00000);
        var INaK__x22:f32 = (( ( INaK__b2*INaK__b1)*INaK__b4+ ( INaK__a1*INaK__a2)*INaK__a3)+ ( INaK__a3*INaK__b1)*INaK__b4)+ ( INaK__a2*INaK__a3)*INaK__b4;
        var INaK__x32:f32 = (( ( INaK__a2*INaK__a3)*INaK__a4+ ( INaK__b3*INaK__b2)*INaK__b1)+ ( INaK__b2*INaK__b1)*INaK__a4)+ ( INaK__a3*INaK__a4)*INaK__b1;
        var INaK__x42:f32 = (( ( INaK__b4*INaK__b3)*INaK__b2+ ( INaK__a3*INaK__a4)*INaK__a1)+ ( INaK__b2*INaK__a4)*INaK__a1)+ ( INaK__b3*INaK__b2)*INaK__a1;
        var INaK__E32:f32 = INaK__x32/(((INaK__x12+INaK__x22)+INaK__x32)+INaK__x42);
        var INaK__E42:f32 = INaK__x42/(((INaK__x12+INaK__x22)+INaK__x32)+INaK__x42);
        var INaK__JnakK:f32 =  2.00000*( INaK__E42*INaK__b1 -  INaK__E32*INaK__a1);
        var INaK__E12:f32 = INaK__x12/(((INaK__x12+INaK__x22)+INaK__x32)+INaK__x42);
        var INaK__E22:f32 = INaK__x22/(((INaK__x12+INaK__x22)+INaK__x32)+INaK__x42);
        var INaK__JnakNa:f32 =  3.00000*( INaK__E12*INaK__a3 -  INaK__E22*INaK__b3);
        var curr_INaK:f32 =  constants.INaK__Pnak*( constants.INaCa_i__zna*INaK__JnakNa+ constants.INaK__zk*INaK__JnakK);
        var diffusion__JdiffK:f32 = (${statesString}.ionic_concentrations__kss - ${statesString}.ionic_concentrations__ki)/2.00000;
        var ionic_concentrations__diff_ki:f32 = (  - ((((curr_IKr+curr_IKs)+curr_IK1)+curr_IKb) -  2.00000*curr_INaK)*cell__Acap)/( ( 2.00000*constants.cell__F)*cell__vmyo)+( diffusion__JdiffK*cell__vss)/cell__vmyo;

        var ICaL__PhiCaK:f32;
        if (${statesString}.vm==0.0) {
            ICaL__PhiCaK = ( constants.cell__F*( ( 0.750000*${statesString}.ionic_concentrations__kss)*exp(CaMK__vfrt) -  0.750000*constants.cell__ko))*1.0;
        } else {
            ICaL__PhiCaK = ( constants.cell__F*( ( 0.750000*${statesString}.ionic_concentrations__kss)*exp(CaMK__vfrt) -  0.750000*constants.cell__ko))*CaMK__vfrt/(exp(CaMK__vfrt) - 1.00000);
        }     
        var curr_ICaK:f32 =  ( ( ( ICaL__PCaK*ICaL__PhiCaK)*${statesString}.ICaL__d)*ICaL__f)*${statesString}.ICaL__fca;
        var ionic_concentrations__diff_kss:f32 = (  - curr_ICaK*cell__Acap)/( ( 2.00000*constants.cell__F)*cell__vss) - diffusion__JdiffK;
        
        var INaCa_i__hna:f32 = exp(( ( constants.INaCa_i__qna*${statesString}.vm)*constants.cell__F)/( constants.cell__R*constants.cell__T));
        var INaCa_i__h7:f32 = 1.00000+ (constants.cell__nao/constants.INaCa_i__kna3)*(1.00000+1.00000/INaCa_i__hna);
        var INaCa_i__h9:f32 = 1.00000/INaCa_i__h7;
        var INaCa_i__k3p:f32 =  INaCa_i__h9*constants.INaCa_i__wca;
        var INaCa_i__h8:f32 = constants.cell__nao/( ( constants.INaCa_i__kna3*INaCa_i__hna)*INaCa_i__h7);
        var INaCa_i__k3pp:f32 =  INaCa_i__h8*constants.INaCa_i__wnaca;
        var INaCa_i__k3:f32 = INaCa_i__k3p+INaCa_i__k3pp;
        var INaCa_i__h1:f32 = 1.00000+ (${statesString}.ionic_concentrations__nai/constants.INaCa_i__kna3)*(1.00000+INaCa_i__hna);
        var INaCa_i__h3:f32 = 1.00000/INaCa_i__h1;
        var INaCa_i__hca:f32 = exp(( ( constants.INaCa_i__qca*${statesString}.vm)*constants.cell__F)/( constants.cell__R*constants.cell__T));
        var INaCa_i__k4p:f32 = ( INaCa_i__h3*constants.INaCa_i__wca)/INaCa_i__hca;
        var INaCa_i__h2:f32 = ( ${statesString}.ionic_concentrations__nai*INaCa_i__hna)/( constants.INaCa_i__kna3*INaCa_i__h1);
        var INaCa_i__k4pp:f32 =  INaCa_i__h2*constants.INaCa_i__wnaca;
        var INaCa_i__k4:f32 = INaCa_i__k4p+INaCa_i__k4pp;
        var INaCa_i__h4:f32 = 1.00000+ (${statesString}.ionic_concentrations__nai/constants.INaCa_i__kna1)*(1.00000+${statesString}.ionic_concentrations__nai/constants.INaCa_i__kna2);
        var INaCa_i__h6:f32 = 1.00000/INaCa_i__h4;
        var INaCa_i__k6:f32 =  ( INaCa_i__h6*${statesString}.ionic_concentrations__cai)*constants.INaCa_i__kcaon;
        var INaCa_i__h5:f32 = ( ${statesString}.ionic_concentrations__nai*${statesString}.ionic_concentrations__nai)/( ( INaCa_i__h4*constants.INaCa_i__kna1)*constants.INaCa_i__kna2);
        var INaCa_i__k7:f32 =  ( INaCa_i__h5*INaCa_i__h2)*constants.INaCa_i__wna;
        var INaCa_i__x1:f32 =  ( INaCa_i__k2*INaCa_i__k4)*(INaCa_i__k7+INaCa_i__k6)+ ( INaCa_i__k5*INaCa_i__k7)*(INaCa_i__k2+INaCa_i__k3);
        var INaCa_i__k8:f32 =  ( INaCa_i__h8*INaCa_i__h11)*constants.INaCa_i__wna;
        var INaCa_i__x2:f32 =  ( INaCa_i__k1*INaCa_i__k7)*(INaCa_i__k4+INaCa_i__k5)+ ( INaCa_i__k4*INaCa_i__k6)*(INaCa_i__k1+INaCa_i__k8);
        var INaCa_i__x3:f32 =  ( INaCa_i__k1*INaCa_i__k3)*(INaCa_i__k7+INaCa_i__k6)+ ( INaCa_i__k8*INaCa_i__k6)*(INaCa_i__k2+INaCa_i__k3);
        var INaCa_i__x4:f32 =  ( INaCa_i__k2*INaCa_i__k8)*(INaCa_i__k4+INaCa_i__k5)+ ( INaCa_i__k3*INaCa_i__k5)*(INaCa_i__k1+INaCa_i__k8);
        var INaCa_i__E1:f32 = INaCa_i__x1/(((INaCa_i__x1+INaCa_i__x2)+INaCa_i__x3)+INaCa_i__x4);
        var INaCa_i__E2:f32 = INaCa_i__x2/(((INaCa_i__x1+INaCa_i__x2)+INaCa_i__x3)+INaCa_i__x4);
        var INaCa_i__JncxCa:f32 =  INaCa_i__E2*INaCa_i__k2 -  INaCa_i__E1*INaCa_i__k1;
        var INaCa_i__E3:f32 = INaCa_i__x3/(((INaCa_i__x1+INaCa_i__x2)+INaCa_i__x3)+INaCa_i__x4);
        var INaCa_i__E4:f32 = INaCa_i__x4/(((INaCa_i__x1+INaCa_i__x2)+INaCa_i__x3)+INaCa_i__x4);
        var INaCa_i__JncxNa:f32 = ( 3.00000*( INaCa_i__E4*INaCa_i__k7 -  INaCa_i__E1*INaCa_i__k8)+ INaCa_i__E3*INaCa_i__k4pp) -  INaCa_i__E2*INaCa_i__k3pp;
        var INaCa_i__allo:f32 = 1.00000/(1.00000+ (constants.INaCa_i__KmCaAct/${statesString}.ionic_concentrations__cai)*(constants.INaCa_i__KmCaAct/${statesString}.ionic_concentrations__cai));
        var curr_INaCa_i:f32 =  ( ( 0.800000*constants.INaCa_i__Gncx)*INaCa_i__allo)*( constants.INaCa_i__zna*INaCa_i__JncxNa+ constants.ICaL__zca*INaCa_i__JncxCa);
        var CaMK__ENa:f32 =  (( constants.cell__R*constants.cell__T)/constants.cell__F)*log(constants.cell__nao/${statesString}.ionic_concentrations__nai);
        var curr_INaL:f32 =  ( ( ( ( constants.INaL__GNaL*${statesString}.INaL__ml)*${statesString}.INaL__ml)*${statesString}.INaL__ml)*${statesString}.INaL__hl)*(${statesString}.vm - CaMK__ENa);
        var curr_INab:f32;
        if (${statesString}.vm==0.0) {
            curr_INab = ( ( constants.INab__PNab*constants.cell__F)*( ${statesString}.ionic_concentrations__nai*exp(CaMK__vfrt) - constants.cell__nao))*1.0;
        } else {
            curr_INab = ( ( constants.INab__PNab*constants.cell__F)*( ${statesString}.ionic_concentrations__nai*exp(CaMK__vfrt) - constants.cell__nao))*CaMK__vfrt/(exp(CaMK__vfrt) - 1.00000);
        }
        var curr_INa:f32 =  ( ( ( ( ( constants.I_Na__GNa*${statesString}.I_Na__m)*${statesString}.I_Na__m)*${statesString}.I_Na__m)*${statesString}.I_Na__h)*${statesString}.I_Na__j)*(${statesString}.vm - CaMK__ENa);
        var diffusion__JdiffNa:f32 = (${statesString}.ionic_concentrations__nass - ${statesString}.ionic_concentrations__nai)/2.00000;
        var ionic_concentrations__diff_nai:f32 = (  - ((((curr_INa+curr_INaL)+ 3.00000*curr_INaCa_i)+ 3.00000*curr_INaK)+curr_INab)*cell__Acap)/( ( 2.00000*constants.cell__F)*cell__vmyo)+( diffusion__JdiffNa*cell__vss)/cell__vmyo;

        var INaCa_ss__h71:f32 = 1.00000+ (constants.cell__nao/constants.INaCa_i__kna3)*(1.00000+1.00000/INaCa_i__hna);
        var INaCa_ss__h91:f32 = 1.00000/INaCa_ss__h71;
        var INaCa_ss__k3p1:f32 =  INaCa_ss__h91*constants.INaCa_i__wca;
        var INaCa_ss__h81:f32 = constants.cell__nao/( ( constants.INaCa_i__kna3*INaCa_i__hna)*INaCa_ss__h71);
        var INaCa_ss__k3pp1:f32 =  INaCa_ss__h81*constants.INaCa_i__wnaca;
        var INaCa_ss__k31:f32 = INaCa_ss__k3p1+INaCa_ss__k3pp1;
        var INaCa_ss__h111:f32 = 1.00000+ (${statesString}.ionic_concentrations__nass/constants.INaCa_i__kna3)*(1.00000+INaCa_i__hna);
        var INaCa_ss__h31:f32 = 1.00000/INaCa_ss__h111;
        var INaCa_ss__k4p1:f32 = ( INaCa_ss__h31*constants.INaCa_i__wca)/INaCa_i__hca;
        var INaCa_ss__h21:f32 = ( ${statesString}.ionic_concentrations__nass*INaCa_i__hna)/( constants.INaCa_i__kna3*INaCa_ss__h111);
        var INaCa_ss__k4pp1:f32 =  INaCa_ss__h21*constants.INaCa_i__wnaca;
        var INaCa_ss__k41:f32 = INaCa_ss__k4p1+INaCa_ss__k4pp1;
        var INaCa_ss__h41:f32 = 1.00000+ (${statesString}.ionic_concentrations__nass/constants.INaCa_i__kna1)*(1.00000+${statesString}.ionic_concentrations__nass/constants.INaCa_i__kna2);
        var INaCa_ss__h61:f32 = 1.00000/INaCa_ss__h41;
        var INaCa_ss__k61:f32 =  ( INaCa_ss__h61*${statesString}.ionic_concentrations__cass)*constants.INaCa_i__kcaon;
        var INaCa_ss__h51:f32 = ( ${statesString}.ionic_concentrations__nass*${statesString}.ionic_concentrations__nass)/( ( INaCa_ss__h41*constants.INaCa_i__kna1)*constants.INaCa_i__kna2);
        var INaCa_ss__k71:f32 =  ( INaCa_ss__h51*INaCa_ss__h21)*constants.INaCa_i__wna;
        var INaCa_ss__x11:f32 =  ( INaCa_ss__k21*INaCa_ss__k41)*(INaCa_ss__k71+INaCa_ss__k61)+ ( INaCa_ss__k51*INaCa_ss__k71)*(INaCa_ss__k21+INaCa_ss__k31);
        var INaCa_ss__k81:f32 =  ( INaCa_ss__h81*INaCa_ss__h1111)*constants.INaCa_i__wna;
        var INaCa_ss__x21:f32 =  ( INaCa_ss__k11*INaCa_ss__k71)*(INaCa_ss__k41+INaCa_ss__k51)+ ( INaCa_ss__k41*INaCa_ss__k61)*(INaCa_ss__k11+INaCa_ss__k81);
        var INaCa_ss__x31:f32 =  ( INaCa_ss__k11*INaCa_ss__k31)*(INaCa_ss__k71+INaCa_ss__k61)+ ( INaCa_ss__k81*INaCa_ss__k61)*(INaCa_ss__k21+INaCa_ss__k31);
        var INaCa_ss__x41:f32 =  ( INaCa_ss__k21*INaCa_ss__k81)*(INaCa_ss__k41+INaCa_ss__k51)+ ( INaCa_ss__k31*INaCa_ss__k51)*(INaCa_ss__k11+INaCa_ss__k81);
        var INaCa_ss__E11:f32 = INaCa_ss__x11/(((INaCa_ss__x11+INaCa_ss__x21)+INaCa_ss__x31)+INaCa_ss__x41);
        var INaCa_ss__E21:f32 = INaCa_ss__x21/(((INaCa_ss__x11+INaCa_ss__x21)+INaCa_ss__x31)+INaCa_ss__x41);
        var INaCa_ss__JncxCa1:f32 =  INaCa_ss__E21*INaCa_ss__k21 -  INaCa_ss__E11*INaCa_ss__k11;
        var INaCa_ss__E31:f32 = INaCa_ss__x31/(((INaCa_ss__x11+INaCa_ss__x21)+INaCa_ss__x31)+INaCa_ss__x41);
        var INaCa_ss__E41:f32 = INaCa_ss__x41/(((INaCa_ss__x11+INaCa_ss__x21)+INaCa_ss__x31)+INaCa_ss__x41);
        var INaCa_ss__JncxNa1:f32 = ( 3.00000*( INaCa_ss__E41*INaCa_ss__k71 -  INaCa_ss__E11*INaCa_ss__k81)+ INaCa_ss__E31*INaCa_ss__k4pp1) -  INaCa_ss__E21*INaCa_ss__k3pp1;
        var INaCa_ss__allo1:f32 = 1.00000/(1.00000+ (constants.INaCa_i__KmCaAct/${statesString}.ionic_concentrations__cass)*(constants.INaCa_i__KmCaAct/${statesString}.ionic_concentrations__cass));
        var curr_INaCa_ss:f32 =  ( ( 0.200000*constants.INaCa_i__Gncx)*INaCa_ss__allo1)*( constants.INaCa_i__zna*INaCa_ss__JncxNa1+ constants.ICaL__zca*INaCa_ss__JncxCa1);
        var ICaL__PhiCaNa:f32;
        if (${statesString}.vm==0.0) {
            ICaL__PhiCaNa = ( constants.cell__F*( ( 0.750000*${statesString}.ionic_concentrations__nass)*exp(CaMK__vfrt) -  0.750000*constants.cell__nao))*1.0;
        } else {
            ICaL__PhiCaNa = ( constants.cell__F*( ( 0.750000*${statesString}.ionic_concentrations__nass)*exp(CaMK__vfrt) -  0.750000*constants.cell__nao))*CaMK__vfrt/(exp(CaMK__vfrt) - 1.00000);
        }
        var curr_ICaNa:f32 =  ( ( ( ICaL__PCaNa*ICaL__PhiCaNa)*${statesString}.ICaL__d)*ICaL__f)*${statesString}.ICaL__fca;
        var ionic_concentrations__diff_nass:f32 = (  - (curr_ICaNa+ 3.00000*curr_INaCa_ss)*cell__Acap)/( ( 2.00000*constants.cell__F)*cell__vss) - diffusion__JdiffNa;

        var curr_ICab:f32;
        if (${statesString}.vm==0.0) {
            curr_ICab = ( ( ( constants.ICab__PCab*2.00000)*constants.cell__F)*( ${statesString}.ionic_concentrations__cai*exp( 2.00000*CaMK__vfrt) -  0.341000*cell__cao))*1.0;
        } else {
            curr_ICab = ( ( ( constants.ICab__PCab*2.00000)*constants.cell__F)*( ${statesString}.ionic_concentrations__cai*exp( 2.00000*CaMK__vfrt) -  0.341000*cell__cao))*( 2.00000*CaMK__vfrt)/(exp( 2.00000*CaMK__vfrt) - 1.00000);
        }
        var CICR__greljsrol:f32 =  ( constants.CICR__grelbarjsrol*(1.00000 - exp( - ${statesString}.CICR__tjsrol/constants.CICR__tauon)))*exp( - ${statesString}.CICR__tjsrol/constants.CICR__tauoff);
        var CICR__Jrelol:f32 =  CICR__greljsrol*(${statesString}.ionic_concentrations__cajsr - ${statesString}.ionic_concentrations__cass);
        var CICR__Jrel:f32 = ${statesString}.CICR__Jrel1+CICR__Jrelol;
        var ITo__kito2:f32 = 1.00000 - 1.00000/(1.00000+ (CICR__Jrel/0.400000)*(CICR__Jrel/0.400000));
        var ITo__rito2:f32 = 1.00000/(1.00000+exp( - (${statesString}.vm+10.0000)/5.00000));
        var curr_ITo:f32 =  ( ( ( constants.ITo__Gto*${statesString}.ITo__aa)*ITo__rito2)*ITo__kito2)*(${statesString}.vm - CaMK__ECl);
        var curr_IpCa:f32 = ( constants.IpCa__GpCa*${statesString}.ionic_concentrations__cai)/(0.000500000+${statesString}.ionic_concentrations__cai);

        // ATTENTION! As paper says  this is uA/uF so it should be multiplied by cm for having uA/cm2, as cm seems to be always 1 this should no matter 
        // but someday one model can have a cm different to 1 and problems or inconsistencies might arrive so I multiply this here.
        var curr_Iion:f32 = (((((((((((((((curr_INa+curr_INaL)+curr_ICaL)+curr_ICaNa)+curr_ICaK)+curr_IKr)+curr_IKs)+curr_IK1)+curr_ITo)+curr_INaCa_i)+curr_INaCa_ss)+curr_INaK)+curr_INab)+curr_IKb)+curr_IpCa)+curr_ICab) * constants.cm;
        
        var SR_uptake__Jtr:f32 = (${statesString}.ionic_concentrations__cansr - ${statesString}.ionic_concentrations__cajsr)/100.000;
        var ionic_concentrations__Bcajsr:f32 = 1.00000/(1.00000+( constants.SR_uptake__csqnmax*constants.SR_uptake__kmcsqn)/( (constants.SR_uptake__kmcsqn+${statesString}.ionic_concentrations__cajsr)*(constants.SR_uptake__kmcsqn+${statesString}.ionic_concentrations__cajsr)));
        var ionic_concentrations__diff_cajsr:f32 =  ionic_concentrations__Bcajsr*(SR_uptake__Jtr - CICR__Jrel);
        
        var SR_uptake__Jtr2:f32 = (${statesString}.ionic_concentrations__cansr - ${statesString}.ionic_concentrations__cacsr)/100.000;
        var ionic_concentrations__Bcacsr:f32 = 1.00000/(1.00000+( constants.SR_uptake__csqnmax*constants.SR_uptake__kmcsqn)/( (constants.SR_uptake__kmcsqn+${statesString}.ionic_concentrations__cacsr)*(constants.SR_uptake__kmcsqn+${statesString}.ionic_concentrations__cacsr)));
        var ionic_concentrations__diff_cacsr:f32 =  ionic_concentrations__Bcacsr*(SR_uptake__Jtr2 - ${statesString}.CICR__Jrel2);

        var SR_uptake__Jleak:f32 = ( 0.00500000*${statesString}.ionic_concentrations__cansr)/15.0000;
        var SR_uptake__Jupnp2:f32 = ( ( 1.00000*0.00500000)*${statesString}.ionic_concentrations__cai2)/(${statesString}.ionic_concentrations__cai2+0.00100000);
        var SR_uptake__Jupp2:f32 = ( ( ( 1.00000*3.00000)*0.00500000)*${statesString}.ionic_concentrations__cai2)/((${statesString}.ionic_concentrations__cai2+0.00100000) - 0.000200000);
        var SR_uptake__fJupp:f32 = 1.00000/(1.00000+constants.CaMK__KmCaMK/CaMK__CaMKa);
        var SR_uptake__Jup2:f32 = ( (1.00000 - SR_uptake__fJupp)*SR_uptake__Jupnp2+ SR_uptake__fJupp*SR_uptake__Jupp2) - SR_uptake__Jleak;
        var SR_uptake__Jupnp:f32 = ( ( 1.00000*0.00500000)*${statesString}.ionic_concentrations__cai)/(${statesString}.ionic_concentrations__cai+0.00100000);
        var SR_uptake__Jupp:f32 = ( ( ( 1.00000*3.00000)*0.00500000)*${statesString}.ionic_concentrations__cai)/((${statesString}.ionic_concentrations__cai+0.00100000) - 0.000200000);
        var SR_uptake__Jup:f32 = ( (1.00000 - SR_uptake__fJupp)*SR_uptake__Jupnp+ SR_uptake__fJupp*SR_uptake__Jupp) - SR_uptake__Jleak;
        var ionic_concentrations__diff_cansr:f32 = (( SR_uptake__Jup*(cell__vnsr1/cell__vnsr)+ SR_uptake__Jup2*(cell__vnsr2/cell__vnsr)) - ( SR_uptake__Jtr*cell__vjsr)/cell__vnsr) - ( SR_uptake__Jtr2*cell__vcsr)/cell__vnsr;

        var diffusion__Jdiff:f32 = (${statesString}.ionic_concentrations__cass - ${statesString}.ionic_concentrations__cai)/0.200000;
        var CICR__Rel1:f32 = ( ( - curr_ICaL+ 2.00000*curr_INaCa_ss)*(cell__Acap/( ( 2.00000*cell__vss)*constants.cell__F))+ CICR__Jrel*(cell__vjsr/cell__vss)) - diffusion__Jdiff;
        var CICR__Jrel1_inf:f32;
        if (CICR__Rel1>0.00000) {
            CICR__Jrel1_inf =  ( ( ( 1.00000*60.0000)*CICR__Rel1)*(1.00000+1.00000/(1.00000+pow(constants.CaMK__KmCaMK/CaMK__CaMKa, 8.00000))))/(1.00000+pow(0.750000/${statesString}.ionic_concentrations__cajsr, 8.00000));
        } else {
            CICR__Jrel1_inf = 0.0;
        }
        var CICR__trel1factor:f32 = ( ( 1.00000*20.0000)*(1.00000+1.00000/(1.00000+pow(constants.CaMK__KmCaMK/CaMK__CaMKa, 8.00000))))/(1.00000+pow(0.500000/${statesString}.ionic_concentrations__cajsr, 8.00000));
        var CICR__tau_Jrel1:f32 = max(0.001,CICR__trel1factor);

        var CICR__Jgap:f32 = (${statesString}.ionic_concentrations__cai - ${statesString}.ionic_concentrations__cai2)/constants.CICR__tau_gap;
        var CICR__Rel2:f32 = (CICR__Jgap+ ${statesString}.CICR__Jrel2*(cell__vcsr/cell__vmyo2)) -  SR_uptake__Jup2*(cell__vnsr2/cell__vmyo2);
        var CICR__Jrel2_inf:f32;
        if (CICR__Rel2>0.0) {
            CICR__Jrel2_inf = ( 1.00000*( ( 250.000*CICR__Rel2)*(1.00000+1.00000/(1.00000+pow(constants.CaMK__KmCaMK/CaMK__CaMKa, 8.00000)))))/(1.00000+pow(0.750000/${statesString}.ionic_concentrations__cacsr, 8.00000));
        } else {
            CICR__Jrel2_inf = 0.0;
        }
        var CICR__trel2factor:f32 = ( 50.0000*(1.00000+1.00000/(1.00000+pow(constants.CaMK__KmCaMK/CaMK__CaMKa, 8.00000))))/(1.00000+pow(0.500000/${statesString}.ionic_concentrations__cacsr, 8.00000));
        var CICR__tau_Jrel2:f32 = max(0.001,CICR__trel2factor);
        
        var ionic_concentrations__Bcai:f32 = 1.00000/((1.00000+( constants.SR_uptake__cmdnmax*constants.SR_uptake__kmcmdn)/( (constants.SR_uptake__kmcmdn+${statesString}.ionic_concentrations__cai)*(constants.SR_uptake__kmcmdn+${statesString}.ionic_concentrations__cai)))+( constants.SR_uptake__trpnmax*constants.SR_uptake__kmtrpn)/( (constants.SR_uptake__kmtrpn+${statesString}.ionic_concentrations__cai)*(constants.SR_uptake__kmtrpn+${statesString}.ionic_concentrations__cai)));
        var ionic_concentrations__diff_cai:f32 =  ionic_concentrations__Bcai*((((  - ((curr_IpCa+curr_ICab) -  2.00000*curr_INaCa_i)*cell__Acap)/( ( ( 2.00000*2.00000)*constants.cell__F)*cell__vmyo1) - ( SR_uptake__Jup*cell__vnsr1)/cell__vmyo1)+( diffusion__Jdiff*cell__vss)/cell__vmyo1) - CICR__Jgap);

        var ionic_concentrations__Bcai2:f32 = 1.00000/((1.00000+( constants.SR_uptake__cmdnmax*constants.SR_uptake__kmcmdn)/( (constants.SR_uptake__kmcmdn+${statesString}.ionic_concentrations__cai2)*(constants.SR_uptake__kmcmdn+${statesString}.ionic_concentrations__cai2)))+( constants.SR_uptake__trpnmax*constants.SR_uptake__kmtrpn)/( (constants.SR_uptake__kmtrpn+${statesString}.ionic_concentrations__cai2)*(constants.SR_uptake__kmtrpn+${statesString}.ionic_concentrations__cai2)));
        var ionic_concentrations__diff_cai2:f32 =  ionic_concentrations__Bcai2*(( ${statesString}.CICR__Jrel2*(cell__vcsr/cell__vmyo2)+( CICR__Jgap*cell__vmyo2)/cell__vmyo1) - ( SR_uptake__Jup2*cell__vnsr2)/cell__vmyo2);

        var ionic_concentrations__Bcass:f32 = 1.00000/((1.00000+( constants.SR_uptake__BSRmax*constants.SR_uptake__KmBSR)/( (constants.SR_uptake__KmBSR+${statesString}.ionic_concentrations__cass)*(constants.SR_uptake__KmBSR+${statesString}.ionic_concentrations__cass)))+( constants.SR_uptake__BSLmax*constants.SR_uptake__KmBSL)/( (constants.SR_uptake__KmBSL+${statesString}.ionic_concentrations__cass)*(constants.SR_uptake__KmBSL+${statesString}.ionic_concentrations__cass)));
        var ionic_concentrations__diff_cass:f32 =  ionic_concentrations__Bcass*(((  - (curr_ICaL -  2.00000*curr_INaCa_ss)*cell__Acap)/( ( ( 2.00000*2.00000)*constants.cell__F)*cell__vss)+( CICR__Jrel*cell__vjsr)/cell__vss) - diffusion__Jdiff);


        // Update with Fordward Euler for non-gating variables
        ${statesString}.CICR__A                     = ${statesString}.CICR__A                     + integ.dt * CICR__diff_A;
        ${statesString}.CICR__tjsrol                = ${statesString}.CICR__tjsrol                + integ.dt * CICR__diff_tjsrol;
        ${statesString}.CaMK__CaMKt                 = ${statesString}.CaMK__CaMKt                 + integ.dt * CaMK__diff_CaMKt;
        ${statesString}.ionic_concentrations__ki    = ${statesString}.ionic_concentrations__ki    + integ.dt * ionic_concentrations__diff_ki;
        ${statesString}.ionic_concentrations__kss   = ${statesString}.ionic_concentrations__kss   + integ.dt * ionic_concentrations__diff_kss; 
        ${statesString}.ionic_concentrations__nai   = ${statesString}.ionic_concentrations__nai   + integ.dt * ionic_concentrations__diff_nai;
        ${statesString}.ionic_concentrations__nass  = ${statesString}.ionic_concentrations__nass  + integ.dt * ionic_concentrations__diff_nass;
        ${statesString}.ionic_concentrations__cajsr = ${statesString}.ionic_concentrations__cajsr + integ.dt * ionic_concentrations__diff_cajsr;
        ${statesString}.ionic_concentrations__cacsr = ${statesString}.ionic_concentrations__cacsr + integ.dt * ionic_concentrations__diff_cacsr;
        ${statesString}.ionic_concentrations__cansr = ${statesString}.ionic_concentrations__cansr + integ.dt * ionic_concentrations__diff_cansr;
        ${statesString}.ionic_concentrations__cai   = ${statesString}.ionic_concentrations__cai   + integ.dt * ionic_concentrations__diff_cai;
        ${statesString}.ionic_concentrations__cai2  = ${statesString}.ionic_concentrations__cai2  + integ.dt * ionic_concentrations__diff_cai2;
        ${statesString}.ionic_concentrations__cass  = ${statesString}.ionic_concentrations__cass  + integ.dt * ionic_concentrations__diff_cass;
        
        // Rush Larsen for gating variables
        ${statesString}.INaL__hl    = INaL__hl_inf    + (${statesString}.INaL__hl    - INaL__hl_inf)    * exp(-integ.dt/constants.INaL__tau_hl);
        ${statesString}.INaL__ml    = INaL__ml_inf    + (${statesString}.INaL__ml    - INaL__ml_inf)    * exp(-integ.dt/INaL__tau_ml);
        ${statesString}.I_Na__m     = I_Na__m_inf     + (${statesString}.I_Na__m     - I_Na__m_inf)     * exp(-integ.dt/I_Na__tau_m);
        ${statesString}.I_Na__h     = I_Na__h_inf     + (${statesString}.I_Na__h     - I_Na__h_inf)     * exp(-integ.dt/I_Na__tau_h);
        ${statesString}.I_Na__j     = I_Na__j_inf     + (${statesString}.I_Na__j     - I_Na__j_inf)     * exp(-integ.dt/I_Na__tau_j);
        ${statesString}.ICaL__d     = ICaL__d_inf     + (${statesString}.ICaL__d     - ICaL__d_inf)     * exp(-integ.dt/ICaL__tau_d);
        ${statesString}.ICaL__fca   = ICaL__fca_inf   + (${statesString}.ICaL__fca   - ICaL__fca_inf)   * exp(-integ.dt/ICaL__tau_fca);
        ${statesString}.IKr__xr     = IKr__xr_inf     + (${statesString}.IKr__xr     - IKr__xr_inf)     * exp(-integ.dt/IKr__tau_xr);
        ${statesString}.ITo__aa     = ITo__aa_inf     + (${statesString}.ITo__aa     - ITo__aa_inf)     * exp(-integ.dt/ITo__tau_aa);
        ${statesString}.ICaL__ff    = ICaL__ff_inf    + (${statesString}.ICaL__ff    - ICaL__ff_inf)    * exp(-integ.dt/ICaL__tau_ff);
        ${statesString}.ICaL__fs    = ICaL__fs_inf    + (${statesString}.ICaL__fs    - ICaL__fs_inf)    * exp(-integ.dt/ICaL__tau_fs);
        ${statesString}.IKs__xs1    = IKs__xs1_inf    + (${statesString}.IKs__xs1    - IKs__xs1_inf)    * exp(-integ.dt/IKs__tau_xs1);
        ${statesString}.IKs__xs2    = IKs__xs2_inf    + (${statesString}.IKs__xs2    - IKs__xs2_inf)    * exp(-integ.dt/IKs__tau_xs2);
        ${statesString}.CICR__Jrel1 = CICR__Jrel1_inf + (${statesString}.CICR__Jrel1 - CICR__Jrel1_inf) * exp(-integ.dt/CICR__tau_Jrel1);
        ${statesString}.CICR__Jrel2 = CICR__Jrel2_inf + (${statesString}.CICR__Jrel2 - CICR__Jrel2_inf) * exp(-integ.dt/CICR__tau_Jrel2);

    `;
}



