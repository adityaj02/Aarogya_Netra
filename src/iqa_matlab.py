import matlab.engine
import os

class MatlabIQA:
    def __init__(self, matlab_path=None):
        print("Starting MATLAB engine... this takes a while.")
        self.eng = matlab.engine.start_matlab()

        if matlab_path:
            # We use genpath to include subfolders if any
            self.eng.addpath(
                self.eng.genpath(matlab_path),
                nargout=0
            )

    def assess(self, image_path):
        image_path = os.path.abspath(image_path)
        
        # Load the image using MATLAB's imread
        matlab_img = self.eng.imread(image_path)

        # Call the assessment function
        result = self.eng.assessFundusQuality(
            matlab_img,
            nargout=1
        )

        import math
        def nan_to_none(v):
            f = float(v)
            return None if math.isnan(f) else f

        return {
            "status": str(result["status"]),
            "reason": str(result["reason"]),
            "fovRatio": nan_to_none(result["fovRatio"]),
            "brightness": nan_to_none(result["brightness"]),
            "darkRatio": nan_to_none(result["darkRatio"]),
            "blurScore": nan_to_none(result["blurScore"])
        }

    def close(self):
        if self.eng:
            self.eng.quit()
            self.eng = None
