import torch
import torch.nn as nn
from torchvision.models import efficientnet_b0,EfficientNet_B0_Weights

backbone=efficientnet_b0(weights=EfficientNet_B0_Weights.DEFAULT)

'''Positional Encoding
The code is same as the one used in Model Training in MP_2_H file'''
class PositionalEncoding(nn.Module):
    def __init__(self,embed_dim,max_len=49):
        super().__init__()
        self.pos_embedding=nn.Parameter(torch.randn(1,max_len,embed_dim))

    def forward(self,x):
        return x+self.pos_embedding

'''Hybrid model, core architecture
The code is same as the one used in Model Training in MP_2_H file'''
class HybridCNNTransformer(nn.Module):
    def __init__(
            self,
            num_classes=7,
            embed_dim=256,
            num_heads=8,
            num_layers=2,
            dropout=0.3
    ):
        super().__init__()
        backbone=efficientnet_b0(weights="DEFAULT")
        self.features=backbone.features
        self.projection=nn.Linear(1280,embed_dim)
        self.position=PositionalEncoding(embed_dim)

        encoder_layer=nn.TransformerEncoderLayer(
            d_model=embed_dim,
            nhead=num_heads,
            dim_feedforward=512,
            dropout=dropout,
            batch_first=True
        )

        self.transformer=nn.TransformerEncoder(encoder_layer,num_layers=num_layers)
        self.dropout=nn.Dropout(dropout)
        self.classifier=nn.Linear(embed_dim,num_classes)

    def forward(self,x):
        x=self.features(x)
        B,C,H,W=x.shape
        x=x.flatten(2)
        x=x.transpose(1,2)
        x=self.projection(x)
        x=self.position(x)
        x=self.transformer(x)
        x=x.mean(dim=1)
        x=self.dropout(x)
        x=self.classifier(x)

        return x