import React from 'react';

interface ChromaGridProps {
    children?: React.ReactNode;
    className?: string;
}

export const ChromaGrid: React.FC<ChromaGridProps> = ({ children, className = '' }) => {
    return (
        <div className={`chroma-grid-container ${className}`}>
            <div className="chroma-grid-background">
                <div className="chroma-grid-line"></div>
                <div className="chroma-grid-line"></div>
                <div className="chroma-grid-line"></div>
                <div className="chroma-grid-line"></div>
                <div className="chroma-grid-line"></div>
            </div>
            <div className="chroma-grid-content">
                {children}
            </div>
        </div>
    );
};

export default ChromaGrid;
