import re
import os
import difflib
from dataclasses import dataclass
from langchain.agents import Tool

from .tool import Toolkit, SimpleTool


@dataclass
class WriteFile(SimpleTool):
    """
    A tool that can be used to write files.
    """
    name = "WriteFile"
    description = "A tool that can be used to write files. " \
                  "The input format is [dir/filename.ext], and starting from the next line the desired content. " \
                  "The tool will overwrite the entire file."

    def __init__(self, wd: str = '.'):
        self.workdir = wd

    def func(self, args: str) -> str:
        # Use a regular expression to extract the file path from the input
        match = re.match(r'\[(.+)\]', args)
        if not match:
            return "Invalid input. Please provide the file path in brackets."

        file_path = match.group(1)
        original_file_path = file_path
        file_path = os.path.join(self.workdir, file_path)

        # Split the input by newline and remove the first line (the file path)
        input_lines = args.strip().split('\n')[1:]

        # Join the remaining lines to form the content
        content = '\n'.join(input_lines)

        try:
            # Check if the directory exists, if not create it
            directory = os.path.dirname(file_path)
            if not os.path.exists(directory):
                os.makedirs(directory)

            # Write the content to the file
            with open(file_path, 'w') as f:
                f.write(content)

            return f"Successfully written to {original_file_path}."
        except Exception as e:
            return f"Error writing to file: {str(e)}"


@dataclass
class ReadFile(SimpleTool):
    """
    A tool that can be used to read files.
    """
    name = "ReadFile"
    description = "A tool that can be used to read files. The input is just the file path."

    def __init__(self, wd: str = '.'):
        self.workdir = wd

    def func(self, args: str) -> str:
        try:
            with open(os.path.join(self.workdir, args), 'r') as f:
                return f.read()
        except Exception as e:
            return f"Error reading file: {str(e)}"


@dataclass
class PatchFile(SimpleTool):
    """
    A tool that can be used to patch files.
    """
    name = "PatchFile"
    description = "A tool that can be used to patch files. " \
                  "The input format starts with the target file path in brackets [filename], " \
                  "followed by a unified format diff without the file headers. " \
                  "This tool applies the patch to the specified file."

    def __init__(self, wd: str = '.'):
        self.workdir = wd

    def func(self, args: str) -> str:
        # Use a regular expression to extract the file path from the input
        match = re.match(r'\[(.+)\]', args)
        if not match:
            return "Invalid input. Please provide the file path in brackets."

        file_path = match.group(1)
        original_file_path = file_path
        file_path = os.path.join(self.workdir, file_path)

        # Check if the file exists
        if not os.path.exists(file_path):
            return f"File not found: {file_path}"

        # Read the original file content
        with open(file_path, 'r') as f:
            original_content = f.readlines()

        # Remove the first line (the file path) and join the remaining lines to form the patch string
        patch_string = '\n'.join(args.strip().split('\n')[1:])

        # Apply the patch
        try:
            patch = difflib.unified_diff(original_content, patch_string.split('\n'))
            patched_content = list(difflib.restore(patch, 2))

            # Write the patched content back to the file
            with open(file_path, 'w') as f:
                f.writelines(patched_content)

            return f"Successfully applied patch to {original_file_path}."
        except Exception as e:
            return f"Error applying patch: {str(e)}"


@dataclass
class FileTools(Toolkit):
    """
    A tool that can be used to read and write files.
    """

    def __init__(self, wd: str = '.'):
        super().__init__(
            name="file tools",
            tools=[
                WriteFile(wd).get_tool(),
                ReadFile(wd).get_tool(),
                PatchFile(wd).get_tool()
            ]
        )
