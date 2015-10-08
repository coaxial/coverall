%%%%%%%%%%%%%%%%%%%%%%%%
% My resume template
% Author: Coaxial <py@poujade.org>
%%%%%%%%%%%%%%%%%%%%%%%%

\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{coaxialcv}

% Forward the options such as page size etc set in the tex file's \documentclass to the underlying document class
\DeclareOption*{%
  \PassOptionsToClass{\CurrentOption}{article}%
}
\ProcessOptions\relax

\LoadClass{article}

\RequirePackage[utf8]{inputenc}
\RequirePackage[T1]{fontenc}
\RequirePackage{titlesec,fontawesome,xstring,hyperref,calc,textcomp,enumitem}
\RequirePackage[usenames,dvipsnames,svgnames,table]{xcolor}

%%%%%%%%%%%%%%%%%%%%%%%%
% override article's default formatting
%%%%%%%%%%%%%%%%%%%%%%%%

% We don't need to indent paragraphs
\setlength{\parindent}{0pt}

% Use the margin before the header (which we don't use) to print more text per page
\addtolength{\textwidth}{0.5\marginparwidth}
\setlength{\marginparwidth}{0.5\marginparwidth}
\addtolength{\textwidth}{0.34\oddsidemargin}
\setlength{\oddsidemargin}{0.66\oddsidemargin}
\addtolength{\textheight}{\topmargin}
\setlength{\topmargin}{0pt}
\addtolength{\textheight}{\headsep}
\setlength{\headsep}{0pt}
\addtolength{\textheight}{\headheight}
\setlength{\headheight}{0pt}
\addtolength{\textheight}{40pt}

% Put some space in the text
\renewcommand{\baselinestretch}{1.1}

% Give the document a more modern feel
% \renewcommand{\familydefault}{\sfdefault}

%%%%%%%%%%%%%%%%%%%%%%%%
% Colors
%%%%%%%%%%%%%%%%%%%%%%%%

\definecolor{formerjobbg}{gray}{0.93}

%%%%%%%%%%%%%%%%%%%%%%%%
% Helpers
%%%%%%%%%%%%%%%%%%%%%%%%

\newcommand{\leftheader}[2]{%
  \sffamily
  \myname{#1}\\
  \myjobtitle{#2}%
  \rmfamily
}

\newcommand{\rightheader}[5]{%
  \myaddress{#1}
  \mywebsite{#2}
  \mygithub{#3}
  \myphone{#4}
  \myemail{#5}
}

\newcommand{\makeheader}[7]{%
  \begin{minipage}[c][0.100\textheight]{0.700\textwidth}
    \leftheader{#1}{#2}
  \end{minipage}%
  \begin{minipage}[0.100\textheight]{0.010\textwidth}
    \rule{1.00pt}{5\headercontactlineheight}
  \end{minipage}%
  \begin{minipage}[0.100\textheight]{0.290\textwidth}
    \contact%
      {#3}
      {#4}
      {#5}
      {#6}
      {#7}
  \end{minipage}\par%
  \headerspacer
}
      

% To wrap header icons
\newcommand{\wrapicon}[1]{
  \makebox[1.5em][c]{#1}
}

% To format my name
\newcommand{\myname}[1]{%
  \Huge{\textbf{#1}}%
}

\newcommand{\myjobtitle}[1]{%
  \Large{\textbf{\textit{#1}}}\par%
}

% To format my location
\newcommand{\myaddress}[1]{%
  \wrapicon{\faicon{map-marker}} \textbf{#1}%
}

% To format my website
% \mywebsite{fqdn}
\newcommand{\mywebsite}[1]{%
  \href{http://#1}{\wrapicon{\footnotesize{\faicon{anchor}}} \textbf{#1}}%
}

% To format my phone number
% \myphone{(555) 123-1234}
\newcommand{\myphone}[1]{%
  \wrapicon{\raisebox{-0.15\height}{\Large{\faicon{mobile}}}} \textbf{#1}%
}

% To format my email
% \myemail{user@example.com}
\newcommand{\myemail}[1]{%
  \href{mailto:#1}{\wrapicon{\small{\faicon{envelope-o}}} \textbf{#1}}%
}

% To format the link to my GitHub profile
% \mygithub{githubusername}
\newcommand{\mygithub}[1]{%
  \href{https://github.com/#1}{\wrapicon{\faicon{github}} \textbf{#1}}%
}

% To format the contact block
\newlength{\headercontactlineheight}
\headercontactlineheight=1.2\baselineskip

\newcommand{\contact}[5]{
  % We use struts here so that we know one line's height exact value. We can then use this lineheight value to draw
  % the rule separating the contact section from the name section. Using \vspace would be easier to read but I didn't
  % find a way to easily have the right length for the rule then.
  \hspace{0.6em}\rule[-.3\baselineskip]{0pt}{\headercontactlineheight}#1\par
  \hspace{0.6em}\rule[-.3\baselineskip]{0pt}{\headercontactlineheight}#2\par
  \hspace{0.6em}\rule[-.3\baselineskip]{0pt}{\headercontactlineheight}#3\par
  \hspace{0.6em}\rule[-.3\baselineskip]{0pt}{\headercontactlineheight}#4\par
  \hspace{0.6em}\rule[-.3\baselineskip]{0pt}{\headercontactlineheight}#5\par
}

% Add space after the header and before the Resume's contents
\newcommand{\headerspacer}{%
  \vspace{1.00cm}\par%
}

\newcommand{\minibio}[1]{%
  {\normalsize{#1}}%
  \vspace{0.70cm}\pagebreak[3]\par
}

\newcommand{\rubric}[1]{%
  \sffamily%
  {\LARGE{\textbf{#1}}}%
  \rmfamily%
  \\\rule[0.70\baselineskip]{0.700\textwidth}{1.0pt}%
  \nopagebreak\par
}

% \formerjob{role}{company}{location}{date}{description}
\newcommand{\formerjob}[5]{%
  % #1: role
  % #2: company (website)
  % #3: location
  % #4: date
  % #5: description
  \colorbox{formerjobbg}{%
    \parbox{\textwidth}{%
      {\large{\textbf{#1}\hfill \textbf{\large{#4}}}}%
      \par%
      {\small{at #2 in #3}}%
    }%
  }%
  \vspace{0.20cm}%
  \nopagebreak\par
  {\textit{#5}}%
  \nopagebreak\par
}

\newcommand{\companywebsite}[1]{%
  \href{http://#1}{#1}%
}

\newcommand{\workitems}[4]{
  \begin{itemize}[itemsep=0.30ex]
  \item #1.
  \item #2.
  \item #3.
  % Avoid empty bullet points
  \IfStrEq{#4}{}{
    \relax
  }{
    \item #4.
  }
  \end{itemize}
  \vspace{0.50cm}%
  \pagebreak[3]\par
}

\newcommand{\diploma}[1]{%
  {\large{\textbf{#1}}}\nopagebreak\par
}

\newcommand{\university}[1]{%
  {\small{#1}}
  \vspace{0.50cm}\pagebreak[3]\par
}

