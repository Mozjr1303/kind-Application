import React, { useState, useEffect } from 'react';

interface AnimatedListItem {
    id: string | number;
    content: React.ReactNode;
}

interface AnimatedListProps {
    items: AnimatedListItem[];
    className?: string;
    delay?: number;
}

export const AnimatedList: React.FC<AnimatedListProps> = ({
    items,
    className = '',
    delay = 100
}) => {
    const [visibleItems, setVisibleItems] = useState<Set<string | number>>(new Set());

    useEffect(() => {
        items.forEach((item, index) => {
            setTimeout(() => {
                setVisibleItems(prev => new Set([...prev, item.id]));
            }, index * delay);
        });
    }, [items, delay]);

    return (
        <div className={`animated-list ${className}`}>
            {items.map((item) => (
                <div
                    key={item.id}
                    className={`animated-list-item ${visibleItems.has(item.id) ? 'visible' : ''}`}
                >
                    {item.content}
                </div>
            ))}
        </div>
    );
};

export default AnimatedList;
