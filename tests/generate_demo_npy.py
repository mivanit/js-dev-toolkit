#!/usr/bin/env python3
"""Generate demo NPY file for array.html range request demo."""

import numpy as np
from pathlib import Path

# 1D array with sin(x) + x for interesting variance
x = np.linspace(0, 20, 500)
arr = (np.sin(x * 2) + x * 0.5).astype(np.float32)

# Ensure output directory exists
output_dir = Path(__file__).parent.parent / "docs"
output_dir.mkdir(parents=True, exist_ok=True)

output_path = output_dir / "demo-array.npy"
np.save(output_path, arr)

print(f"Created {output_path}")
print(f"  Shape: {arr.shape}")
print(f"  Dtype: {arr.dtype}")
print(f"  Range: [{arr.min():.2f}, {arr.max():.2f}]")
