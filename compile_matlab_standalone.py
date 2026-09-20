import matlab.engine
print("Starting MATLAB engine...")
eng = matlab.engine.start_matlab()
print("Building standalone executable...")
eng.eval("compiler.build.standaloneApplication('src/IQA_Matlab/assessFundusQuality.m', 'OutputDir', './matlab_compiled')", nargout=0)
eng.quit()
print("Done.")
