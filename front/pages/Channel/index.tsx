import ChatBox from '@components/ChatBox';
import ChatList from '@components/ChatList';
import InviteChannelModal from '@components/InviteChannelModal';
import useInput from '@hooks/useInput';
import useSocket from '@hooks/useSocket';
import { Container, Header, DragOver } from '@pages/Channel/styles';
import { IChannel, IChat, IUser } from '@typings/db';
import fetcher from '@utils/fetcher';
import makeSection from '@utils/makeSection';
import axios from 'axios';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Scrollbars from 'react-custom-scrollbars';
import { useParams } from 'react-router';
import useSWR, { useSWRInfinite } from 'swr';

const Channel = () => {
  const { workspace, channel } = useParams<{ workspace: string; channel: string }>();
  const { data: myData } = useSWR('/api/users', fetcher);
  const [chat, onChangeChat, setChat] = useInput('');
  const { data: channelData } = useSWR<IChannel>(`/api/workspaces/${workspace}/channels/${channel}`, fetcher);
  //채팅 받아오는 API
  const {
    data: chatData,
    mutate: mutateChat,
    revalidate,
    setSize, // index는 페이지수, setSize는 페이지수를 바꿔줌
  } = useSWRInfinite<IChat[]>(
    (index) => `/api/workspaces/${workspace}/channels/${channel}/chats?perPage=20&page=${index + 1}`,
    fetcher,
    {
      onSuccess(data) {
        if (data?.length === 1) {
          setTimeout(() => {
            scrollbarRef.current?.scrollToBottom();
          }, 100);
        }
      },
    },
  );
  const { data: channelMembersData } = useSWR<IUser[]>( // 채널 참가중인 멤버들
    myData ? `/api/workspaces/${workspace}/channels/${channel}/members` : null,
    fetcher,
  );

  const [socket] = useSocket(workspace);
  const isEmpty = chatData?.[0]?.length === 0;
  const isReachingEnd = isEmpty || (chatData && chatData[chatData.length - 1]?.length < 20) || false; // 기본값 false
  const scrollbarRef = useRef<Scrollbars>(null);
  const [showInviteChannelModal, setShowInviteChannelModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  //채팅 보내는 API
  const onSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      console.log(chat);
      if (chat?.trim() && chatData && channelData) {
        // optimistic UI 화면에 먼저 반영 서버에 가지않기때문에 임의로 성공한거처럼 데이터
        mutateChat((prevChatData) => {
          const savedChat = chat;
          prevChatData?.[0].unshift({
            id: (chatData[0][0]?.id || 0) + 1,
            content: savedChat,
            UserId: myData.id,
            User: myData, // 채널은 받는사람없고 보내는사람만 있음
            ChannelId: channelData.id,
            Channel: channelData,
            createdAt: new Date(),
          });
          return prevChatData;
        }, false) // shouldRevalidate가 false여야함
          .then(() => {
            localStorage.setItem(`${workspace}-${channel}`, new Date().getTime().toString());
            setChat(''); // 채팅 보내고 공백으로
            scrollbarRef.current?.scrollToBottom(); // 채팅 보냈을때 가장 밑으로
          });
        axios
          .post(`/api/workspaces/${workspace}/channels/${channel}/chats`, {
            content: chat,
          })
          .then(() => {
            revalidate(); // 바로 받아오게끔
          })
          .catch(console.error);
      }
    },
    [chat, chatData, myData, channelData, workspace, channel],
  );

  const onMessage = useCallback(
    (data: IChat) => {
      // 데이터의 채널명이 내 채널과 같은지
      // 내가 친 채팅은 위에서 Optimstic UI로 넣었기 때문에 socket.io에서 오는 데이터에서는 걸러줘야함
      if (data.Channel.name === channel && data.UserId !== myData?.id) {
        mutateChat((chatData) => {
          chatData?.[0].unshift(data);
          return chatData;
        }, false).then(() => {
          if (scrollbarRef.current) {
            if (
              scrollbarRef.current.getScrollHeight() <
              scrollbarRef.current.getClientHeight() + scrollbarRef.current.getScrollTop() + 150
            ) {
              console.log('scrollToBottom!', scrollbarRef.current?.getValues());
              setTimeout(() => {
                scrollbarRef.current?.scrollToBottom();
              }, 50);
            }
          }
        });
      }
    },
    [channel, myData],
  );

  useEffect(() => {
    socket?.on('message', onMessage);
    return () => {
      socket?.off('message', onMessage);
    };
  }, [socket, onMessage]);

  // 로딩 시 스크롤바 제일 아래로
  useEffect(() => {
    if (chatData?.length === 1) {
      console.log('toBottomWhenLoaded', scrollbarRef.current);
      setTimeout(() => {
        console.log('scrollbar', scrollbarRef.current);
        scrollbarRef.current?.scrollToBottom(); // 채팅데이터가 있어서 불러온 경우 스크롤바 가장 밑으로
      }, 500);
    }
  }, [chatData]);

  // 페이지가 로딩될때 localStorage에 현재 시간을 저장해둠
  useEffect(() => {
    localStorage.setItem(`${workspace}-${channel}`, new Date().getTime().toString());
  }, [workspace, channel]);

  const onClickInviteChannel = useCallback(() => {
    setShowInviteChannelModal(true);
  }, []);

  const onCloseModal = useCallback(() => {
    setShowInviteChannelModal(false);
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      console.log(e);
      const formData = new FormData();
      if (e.dataTransfer.items) {
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          if (e.dataTransfer.items[i].kind === 'file') {
            const file = e.dataTransfer.items[i].getAsFile();
            console.log('... file[' + i + '].name = ' + file.name);
            formData.append('image', file);
          }
        }
      } else {
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          console.log('... file[' + i + '].name = ' + e.dataTransfer.files[i].name);
          formData.append('image', e.dataTransfer.files[i]);
        }
      }
      axios.post(`/api/workspaces/${workspace}/channels/${channel}/images`, formData).then(() => {
        setDragOver(false);
        localStorage.setItem(`${workspace}-${channel}`, new Date().getTime().toString());
      });
    },
    [workspace, channel],
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    console.log(e);
    setDragOver(true);
  }, []);

  if (!myData || !myData) {
    return null;
  }

  const chatSections = makeSection(chatData ? chatData.flat().reverse() : []); // 2차원배열을 1차열배열로 바꿔주고 reverse

  return (
    <Container onDrop={onDrop} onDragOver={onDragOver}>
      <Header>
        <span>#{channel}</span>
        <div className="header-right">
          <span>{channelMembersData?.length}</span>
          <button
            onClick={onClickInviteChannel}
            className="c-button-unstyled p-ia__view_header__button"
            aria-label="Add people to #react-native"
            data-sk="tooltip_parent"
            type="button"
          >
            <i className="c-icon p-ia__view_header__button_icon c-icon--add-user" aria-hidden="true" />
          </button>
        </div>
      </Header>
      <ChatList chatSections={chatSections} ref={scrollbarRef} setSize={setSize} isReachingEnd={isReachingEnd} />
      <ChatBox chat={chat} onChangeChat={onChangeChat} onSubmitForm={onSubmitForm} />
      <InviteChannelModal
        show={showInviteChannelModal}
        onCloseModal={onCloseModal}
        setShowInviteChannelModal={setShowInviteChannelModal}
      />
      {dragOver && <DragOver>업로드!</DragOver>}
    </Container>
  );
};

export default Channel;
