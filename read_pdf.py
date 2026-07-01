import PyPDF2
import sys
import io
import glob

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Find the file
files = glob.glob(r'C:\Users\gjanl\OneDrive\Dokumen\*Easit*.pdf')
print(f"Found files: {files}")

if files:
    reader = PyPDF2.PdfReader(files[0])
    print(f"\nTotal pages: {len(reader.pages)}\n")
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            print(f'--- PAGE {i+1} ---')
            print(text)
            print()
