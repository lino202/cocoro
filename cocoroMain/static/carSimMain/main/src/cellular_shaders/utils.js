export const expm1 = /*wgsl*/`


    fn expm1(x:f32) -> f32{
        if (abs(x) < 1e-7) {
            // Use a Taylor series expansion for small x to avoid catastrophic cancellation
            return x + (pow(x,2) / 2.0) + (pow(x,3) / 6.0) + (pow(x,4)/24.0);
        } else {
            // Use the original expression for larger x
            return exp(x) - 1;
        }
    }


    `;
