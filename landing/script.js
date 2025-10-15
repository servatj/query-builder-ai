// Landing Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Active navigation highlighting on scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinksAll = document.querySelectorAll('.nav-link');
    
    function updateActiveNav() {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (window.pageYOffset >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });
        
        navLinksAll.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }
    
    window.addEventListener('scroll', updateActiveNav);
    
    // Animate feature cards on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
    
    // Mobile menu toggle (if needed in future)
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navigation = document.querySelector('.navigation');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            navigation.classList.toggle('mobile-open');
        });
    }
    
    // Check if external links are accessible
    function checkLinkStatus() {
        const externalLinks = document.querySelectorAll('a[target="_blank"]');
        
        externalLinks.forEach(link => {
            const href = link.getAttribute('href');
            
            // Add visual indicator for local development links
            if (href.includes('localhost:3000')) {
                const indicator = document.createElement('span');
                indicator.textContent = ' (local)';
                indicator.style.fontSize = '0.75rem';
                indicator.style.opacity = '0.7';
                link.appendChild(indicator);
            }
        });
    }
    
    checkLinkStatus();
    
    // Header background on scroll
    const header = document.querySelector('.header');
    
    function updateHeaderBackground() {
        if (window.scrollY > 50) {
            header.style.background = 'rgba(255, 255, 255, 0.95)';
            header.style.backdropFilter = 'blur(10px)';
        } else {
            header.style.background = '#fff';
            header.style.backdropFilter = 'none';
        }
    }
    
    window.addEventListener('scroll', updateHeaderBackground);
    
    // Blog Post Loading and Modal Functionality
    const blogPosts = [
        {
            slug: 'welcome-to-maisql',
            title: 'Welcome to Maisql: AI-Powered SQL Query Builder',
            date: 'October 15, 2024',
            excerpt: 'Introducing Maisql - the revolutionary platform that transforms natural language into SQL queries using advanced AI technology.',
            tags: ['launch', 'AI', 'SQL', 'introduction'],
            file: 'welcome-to-maisql.md'
        }
    ];
    
    // Create and append blog modal to body
    function createBlogModal() {
        const modal = document.createElement('div');
        modal.className = 'blog-modal';
        modal.id = 'blogModal';
        modal.innerHTML = `
            <div class="blog-modal-content">
                <button class="blog-modal-close" id="closeBlogModal">&times;</button>
                <div class="blog-modal-body" id="blogModalBody">
                    <!-- Blog content will be loaded here -->
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Close modal on click outside or close button
        modal.addEventListener('click', function(e) {
            if (e.target === modal || e.target.id === 'closeBlogModal') {
                closeBlogModal();
            }
        });
        
        // Close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeBlogModal();
            }
        });
    }
    
    function openBlogModal() {
        const modal = document.getElementById('blogModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    function closeBlogModal() {
        const modal = document.getElementById('blogModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }
    
    // Simple markdown parser
    function parseMarkdown(markdown) {
        let html = markdown;
        
        // Remove frontmatter
        html = html.replace(/^---[\s\S]*?---\n\n/, '');
        
        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Horizontal rule
        html = html.replace(/^---$/gim, '<hr>');
        
        // Lists
        html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Paragraphs
        html = html.split('\n\n').map(para => {
            if (!para.match(/^<[h|u|l]/)) {
                return `<p>${para}</p>`;
            }
            return para;
        }).join('\n');
        
        return html;
    }
    
    // Load blog post content
    async function loadBlogPost(slug) {
        const post = blogPosts.find(p => p.slug === slug);
        if (!post) return;
        
        try {
            const response = await fetch(`../blog/${post.file}`);
            const markdown = await response.text();
            const html = parseMarkdown(markdown);
            
            const modalBody = document.getElementById('blogModalBody');
            if (modalBody) {
                modalBody.innerHTML = html;
                openBlogModal();
            }
        } catch (error) {
            console.error('Error loading blog post:', error);
            const modalBody = document.getElementById('blogModalBody');
            if (modalBody) {
                modalBody.innerHTML = '<p>Sorry, could not load the blog post. Please try again later.</p>';
                openBlogModal();
            }
        }
    }
    
    // Initialize blog functionality
    createBlogModal();
    
    // Add click handlers to "Read More" links
    const readMoreLinks = document.querySelectorAll('.blog-read-more');
    readMoreLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const postSlug = this.getAttribute('data-post');
            loadBlogPost(postSlug);
        });
    });
});
});