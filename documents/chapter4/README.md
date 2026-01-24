# LLM数学推理
本项目实现了让大规模语言模型（LLM）学习数学推理的代码，主要技术为使用Supervised Finetuning（SFT）来让模型学习DeepSeek-R1生成的回复，从中学习复杂的数学推理技能（如反思、验算等）。
本实验基于[DeepMath-103K](https://huggingface.co/datasets/zwhe99/DeepMath-103K)数据集以及[Qwen/Qwen2.5-Math-1.5B](https://huggingface.co/Qwen/Qwen2.5-Math-1.5B)模型，带领读者初步尝试在数学任务上的数据蒸馏全流程。

## 实验目的
- 了解数学相关的数据集的清理和预处理
- 了解微调大模型的基本方法
- 了解使用大模型进行推理的基本方法
- 了解评测模型数学能力的基本方法

## 环境要求

- Python 3.8+
- PyTorch
- Transformers
- Datasets
- vllm
- 至少40GB显存的GPU

## 实验文档

1. 打开Jupyter notebook：
```bash
jupyter notebook sft_math.ipynb
```

2. notebook包含几个主要部分：
   - 数据集下载以及预处理
   - 模型加载、训练
   - 模型生成、评测

3. 具体操作和说明请参考notebook。

## 输出文件

训练过程会产生训练的checkpoint文件，生成完成后会保存生成结果。

## 注意事项

- 模型和数据需要从huggingface加载，国内可以通过https://hf-mirror.com 镜像进行下载。
- 确保有足够的磁盘空间保存原始模型文件、数据文件以及训练后的checkpoint(请预留至少50GB空间)
- 需要使用至少40GB显存的GPU显卡
