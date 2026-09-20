import matlab.engine
print("Starting MATLAB engine...")
eng = matlab.engine.start_matlab()
print("Building package...")
eng.eval("compiler.build.pythonPackage('src/IQA_Matlab/assessFundusQuality.m', 'PackageName', 'FundusIQA', 'OutputDir', './matlab_compiled')", nargout=0)
eng.quit()
print("Done.")
