using System;
using System.Net;
using System.Windows;

public class Wavelet97CSharp
{
    private const int kMaxFilterSize = 9;  /// The extent of a 9/7 wavelet filter is 9
    private const int kMaxBoundSize = kMaxFilterSize >> 1; /// Maximum bound is the size of a "lobes" of the filter
    private const int kSubbandTileSize = 256;  /// Tile size - hardcoded for performance
    private const int kInverseNrPixels = kInverseTileSize * kInverseTileSize;  /// Number of pixels in a inverse tile
    /// Required tile size for inverse transform to correctly handle borders
    private const int kInverseTileSize = kSubbandTileSize + 4 * kMaxBoundSize; 

    // Constants for bounds array
    private const int kLeft = 0;
    private const int kRight = 1;
    private const int kTop = 2;
    private const int kBottom = 3;

    public static void inverseNineSevenRow(float[] outRow, float[] inRow, int blockSize,
        int offset, bool doLeft, bool doRight) 
    {
        // Constants used during processing
        int hBlockSize = blockSize / 2;
        int qStop      = blockSize + 3 * offset;
        int offEnd     = offset + hBlockSize;
        int qOff       = hBlockSize + 3 * offset;
        int qEnd       = qOff + blockSize - 1 - hBlockSize;

        // Constants for 9,7 filter. 
        const float kAlpha  = -1.586134342f;     
        const float kBetta  = -0.05298011854f;
        const float kGamma  =  0.8829110762f;
        const float kDelta  =  0.4435068522f;
        const float kEtta   =  1.149604398f;
        const float kEttaDelta =  kEtta * kDelta;
        const float kOneOverEtta = (1.0f / kEtta);
        
        /*************** FIRST STEP: X reversed update & scale (2) *****************/

        // Processing depend on border handling
        float leftLambda = (doLeft) ? 
            kOneOverEtta * inRow[offset-1] - kEttaDelta * (inRow[qOff-2] + inRow[qOff-1]) :
            kOneOverEtta * inRow[offset+1] - kEttaDelta * (inRow[qOff+1] + inRow[qOff  ]);
  
        // First intermediate value of border depends on left border 
        outRow[0] = (doLeft) ? 
            kOneOverEtta * inRow[offset] - kEttaDelta * (inRow[qOff-1] + inRow[qOff]) :
            kOneOverEtta * inRow[offset] - kEttaDelta * (inRow[qOff  ] + inRow[qOff]);
    
        // Inner processing step of the first step - this loop is computationally intensive and could benefit
        // from vectorization, but that is unlikely to happen with the CLR
        for (int j = 1; j < hBlockSize; ++j)
        {
            outRow[j+j] = kOneOverEtta * inRow[offset+j] - kEttaDelta * (inRow[qOff+j] + inRow[qOff+j+1]);
        }

         // Handling of right border 
        float rightLambda0 = (doRight) ?
            kOneOverEtta * inRow[offEnd] - kEttaDelta * (inRow[qStop] + inRow[qStop + 1]) :
            kOneOverEtta * inRow[offEnd - 1] - kEttaDelta * (inRow[qStop] + inRow[qStop - 1]);

        float rightLambda1 = (doRight) ? 
            kOneOverEtta * inRow[offEnd+1] - kEttaDelta * (inRow[qStop+1] + inRow[qStop+2]) :
            (blockSize > 4) ? kOneOverEtta * inRow[offEnd-2] - kEttaDelta * (inRow[qStop-1] + inRow[qStop-2]) :
                             kOneOverEtta * inRow[offEnd-2] - kEttaDelta * (inRow[qStop-1] + inRow[qStop-1]);

        /*************** SECOND STEP: X reversed prediction (2) *****************/

        // Again, handle border separately
        float leftGamma = (doLeft) ? 
            kEtta * inRow[qOff-1] - kGamma * (leftLambda + outRow[0]) :
            kEtta * inRow[qOff  ] - kGamma * (leftLambda + outRow[0]);

        // Computationally intensive loop of first step
        int k = 1;
        for (int j = qOff; j < qEnd; ++j, k += 2)
        {
            outRow[k] = kEtta * inRow[j] - kGamma * (outRow[k-1] + outRow[k+1]);
        }

        // Handle boundary case
        outRow[k] = kEtta * inRow[qEnd] - kGamma * (outRow[k-1] + rightLambda0);

        float rightGamma = (doRight) ? 
            kEtta * inRow[qEnd+1] - kGamma * (rightLambda0 + rightLambda1) :
            kEtta * inRow[qEnd-1] - kGamma * (rightLambda0 + rightLambda1);

       /*************** THIRD STEP: X reversed update (1) *****************/

        // left border
        outRow[0] = outRow[0] - kBetta * (leftGamma + outRow[1]);

        // inner computational loop
        for (int s = 2; s < blockSize; s += 2)
        {
            outRow[s] -= kBetta * (outRow[s-1] + outRow[s+1]);
        }

        // right border
        rightLambda0 -= kBetta * (outRow[blockSize - 1] + rightGamma);

        /*************** FOURTH STEP: X reversed prediction (1) *****************/

        for (int s = 1; s < blockSize-1; s += 2) 
        {
            outRow[s] -= kAlpha * (outRow[s-1] + outRow[s+1]);
        }

        // special case of last prediction
        outRow[blockSize-1] -= kAlpha * (outRow[blockSize-2] + rightLambda0);
    }  // end of function inverseNineSevenRow

    /// Perform a 1D forward 9/7 wavelet transform 
    public static void inverseNineSeven(float[] image, int blockSize, int offset, bool[] bound)
    {
        int hBlockSize = blockSize / 2;
        int startCol = bound[kLeft] ? 0 : offset;
        int endCol = blockSize + offset * (bound[kRight] ? 4 : 3);
        int nColCoef = blockSize + 4 * offset;

        // Create two small temporary arrays to hold scratch data. Would like to do that on the stack (gave a 
        // significant speed bump in C++) but C# wants to use the stack
        float[] tmpOut = new float[kInverseTileSize];
        float[] tmpIn = new float[kInverseTileSize];

        // The 2D transform is performed by doing successive 1D transforms, first along the columns and then
        // along the rows of the image. Start with the columns:
        for (int jCol = startCol; jCol < endCol; ++jCol)
        {
            // handle boundaries correctly by modifying jCol if appropriate.
            if (bound[kBottom] && jCol == offset + hBlockSize) jCol += offset;
            if (bound[kTop] && jCol == 2 * offset + hBlockSize) jCol += offset;

            // Copy column to temporary array. This copying loop addresses against the stride; 
            //  # of cache lines that are hit is 272, exceeding L1 cache capacity so this loop is L2 cache 
            // bound (cache used is 272*64 bytes = 19K).
            // At 600 tiles per second, this innerloop touches 600*272*272*64 bytes/s, which is 2709 MB/s.  
            for (int i = 0; i < nColCoef; ++i)
            {
                tmpIn[i] = image[jCol + i * kInverseTileSize];
            }

            // perform 1D wavelet transform
            inverseNineSevenRow(tmpOut, tmpIn, blockSize, offset, bound[kTop], bound[kBottom]);

            // copy back to input image
            for (int i = 0; i < nColCoef; ++i)
            {
                image[jCol + i * kInverseTileSize] = tmpOut[i];
            }
        }

        // Now transform the rows. 
        for (int row = 0; row < blockSize; ++row)
        {
            int off = row * kInverseTileSize;
            for (int i = 0; i < blockSize; ++i)
            {
                tmpIn[i] = image[off + i];
            }
            inverseNineSevenRow(tmpOut, tmpIn, blockSize, offset, bound[kLeft], bound[kRight]);
            for (int i = 0; i < blockSize; ++i)
            {
                image[off + i] = tmpOut[i];
            }
        }
    }

    /// Benchmark the forward 9/7 transform; the function returns the tiles per second (i.e. # of contextual regions)
    /// that is being converted for one core. 
    public static int benchmarkInverse()
    {
        // create input image
        float[] image = new float [kInverseNrPixels];
        bool [] bounds = { false, true, true, false};

        // run for one second, count # iterations
        int start = System.Environment.TickCount;
        int nr = 0;
        while ((System.Environment.TickCount - start) < 1000) 
        {
            inverseNineSeven(image,kSubbandTileSize, 2, bounds);
            ++nr;
        }
        return nr;
    }

}
